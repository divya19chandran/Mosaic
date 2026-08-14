// Shared "drive the real app through Playwright and score it" engine.
//
// Pulled out of run.mjs so both the plain CLI (`npm run evals`) and the
// combined live+historical report (`npm run evals:report`) can reuse the
// exact same browser-driving logic instead of two copies drifting apart.
// This module only produces raw results -- it doesn't print anything or
// decide exit codes, so callers can present the same data differently.

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { scoreCase } from './scoring.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Dev server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function extractActualFields(page, filePath) {
  await page.click('nav >> text=Explore');
  await page.click('button:has-text("+ Add")');
  await page.waitForTimeout(300);

  await page.setInputFiles('input[type="file"]', filePath);

  // Poll for the OCR status message to settle instead of a blind sleep —
  // status text is either "reading" (in progress), "Pulled a title..."
  // (done), or "Couldn't read text..." (error).
  const modal = page.locator('div.fixed').first();
  const deadline = Date.now() + 20000;
  let statusText = '';
  while (Date.now() < deadline) {
    statusText = await modal.innerText().catch(() => '');
    if (statusText.includes('Pulled a title') || statusText.includes("Couldn't read text")) break;
    await page.waitForTimeout(300);
  }

  const ocrStatus = statusText.includes("Couldn't read text")
    ? 'error'
    : statusText.includes('Pulled a title')
      ? 'done'
      : 'timeout';

  const title = await page.locator('input[placeholder="What is it?"]').inputValue().catch(() => '');
  const date = await page.locator('input[type="date"]').first().inputValue().catch(() => '');
  const time = await page.locator('input[placeholder*="5:30 PM"]').inputValue().catch(() => '');
  const location = await page.locator('input[placeholder="Venue or address"]').inputValue().catch(() => '');
  const description = await page
    .locator('textarea[placeholder="Anything you want to remember about this"]')
    .inputValue()
    .catch(() => '');
  // Category is a <select>; read its selected option's visible text rather
  // than the underlying id, since the manifest's expectations are written
  // in plain-language category names.
  const category = await page
    .locator('select')
    .evaluate((el) => el.options[el.selectedIndex]?.textContent?.trim() ?? '')
    .catch(() => '');

  await page.click('button:has-text("Cancel")').catch(() => {});
  await page.waitForTimeout(200);

  return { ocrStatus, fields: { title, date, time, location, description, category } };
}

/**
 * Runs every case in evals/fixtures/manifest.json against a real (or
 * already-running) dev server and scores each one with scoring.mjs.
 *
 * Options:
 *   url - an already-running dev server to hit instead of spawning one.
 *
 * Returns { results, statusMismatches }, where `results` is an array of
 * scoreCase() outputs and `statusMismatches` lists any case whose OCR
 * status (done/error) didn't match what the fixture expected.
 */
export async function runLiveEvals({ url } = {}) {
  const manifest = JSON.parse(await readFile(path.join(FIXTURES_DIR, 'manifest.json'), 'utf-8'));

  let serverProcess = null;
  let baseUrl = url;

  if (!baseUrl) {
    const port = 5199;
    baseUrl = `http://127.0.0.1:${port}`;
    // Spawn the local vite binary directly rather than going through `npx`
    // — npx spawns vite as its own child process, so killing the npx
    // wrapper later doesn't kill vite itself and leaves an orphaned server
    // running. Spawning the binary directly means `serverProcess` IS the
    // vite process, so `.kill()` actually stops it.
    const viteBin = path.join(__dirname, '..', 'node_modules', '.bin', 'vite');
    serverProcess = spawn(
      viteBin,
      ['--config', 'evals/vite.config.evals.ts', '--port', String(port), '--strictPort'],
      { cwd: path.join(__dirname, '..'), stdio: 'ignore' },
    );
    await waitForServer(baseUrl);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  const results = [];
  const statusMismatches = [];

  for (const testCase of manifest.cases) {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const filePath = path.join(FIXTURES_DIR, testCase.file);
    const { ocrStatus, fields } = await extractActualFields(page, filePath);

    if (testCase.expectOcrStatus && ocrStatus !== testCase.expectOcrStatus) {
      statusMismatches.push(`${testCase.id}: expected OCR status "${testCase.expectOcrStatus}", got "${ocrStatus}"`);
    }

    const scored = scoreCase(testCase.id, testCase.expect, fields, {
      file: testCase.file,
      type: testCase.type,
      description: testCase.description,
      ocrStatus,
    });
    results.push(scored);
  }

  await browser.close();
  if (serverProcess) serverProcess.kill();

  return { results, statusMismatches };
}

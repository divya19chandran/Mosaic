// Minimal standalone server for production use: serves the built `dist/`
// folder as static files and handles the one dynamic route this app needs,
// `GET /api/extract-link?url=...`. Uses only Node's built-in `http`/`fs`
// modules (no Express) so this feature doesn't require adding a new
// dependency to a project that was, until now, 100% static.
//
// Run with: node server/index.js
// (After `npm run build` has produced a `dist/` folder next to this file.)

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractLinkMetadata } from './extractLink.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const port = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function handleExtractLink(req, res, url) {
  const target = url.searchParams.get('url');
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing url parameter' }));
    return;
  }
  try {
    const data = await extractLinkMetadata(target);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Extraction failed' }));
  }
}

async function serveStatic(req, res, pathname) {
  let filePath = path.join(distDir, decodeURIComponent(pathname));
  // Guard against `..` escaping dist/ via a crafted request path.
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const stat = await readFile(filePath).catch(() => null);
    if (stat === null) throw new Error('not found');
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(stat);
  } catch {
    // Single-page app: any unknown path falls back to index.html so client
    // side routing (if this app grows any) keeps working.
    try {
      const indexHtml = await readFile(path.join(distDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexHtml);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/extract-link') {
    await handleExtractLink(req, res, url);
    return;
  }

  await serveStatic(req, res, url.pathname === '/' ? '/index.html' : url.pathname);
});

server.listen(port, () => {
  console.log(`Hobbies app listening on http://localhost:${port}`);
});

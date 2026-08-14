// Screenshot-OCR eval runner (CLI).
//
// Drives the real app (via a Vite dev server) through Playwright, uploads
// each fixture image listed in evals/fixtures/manifest.json through the
// "Add something to your list" screenshot flow, and scores the resulting
// form fields with evals/scoring.mjs — per-field accuracy, groundedness
// (does it invent values for fields that aren't in the source image, or
// correctly leave them blank), ambiguity handling (a field can have more
// than one reasonable correct answer), and an end-to-end "usable without
// manual correction" verdict per case.
//
// This is the automated counterpart to the manual "re-upload and eyeball
// it" process EVALS.md's Cases table relies on for real reported failures
// that don't have a saved fixture file to re-run. Those historical cases
// are scored separately in evals/historical-cases.mjs and combined with
// this file's live results by `npm run evals:report` — this script only
// ever runs the live, fixture-backed cases, since those are the only ones
// that can meaningfully catch a regression.
//
// The actual browser-driving logic lives in evals/live-runner.mjs so it can
// be shared with the combined report.
//
// Usage:
//   npm run evals                                   (starts its own dev server)
//   npm run evals -- --url http://localhost:5199     (use an already-running server)
//
// Exits non-zero if any case isn't usable-without-correction, so this is
// CI/pre-commit friendly.

import { runLiveEvals } from './live-runner.mjs';
import { summarize } from './scoring.mjs';

function parseArgs(argv) {
  const args = { url: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { results, statusMismatches } = await runLiveEvals({ url: args.url });

  console.log('');
  console.log('Screenshot OCR evals');
  console.log('====================');
  for (const r of results) {
    const label = r.usableWithoutCorrection ? 'PASS' : 'FAIL';
    console.log(`${label}  ${r.id}  (${r.meta.file}) [${r.meta.type}]`);
    for (const [field, verdict] of Object.entries(r.fields)) {
      if (verdict === null) continue;
      if (verdict !== 'correct' && verdict !== 'blank_correct') {
        console.log(`      - ${field}: ${verdict}`);
      }
    }
  }
  if (statusMismatches.length) {
    console.log('\nOCR status mismatches:');
    statusMismatches.forEach((m) => console.log(`  - ${m}`));
  }

  const summary = summarize(results);
  console.log('\nPer-field accuracy (correct + acceptable / scored):');
  for (const [field, stats] of Object.entries(summary.perField)) {
    if (stats.scored === 0) continue;
    console.log(
      `  ${field.padEnd(12)} ${stats.accuracyPct}%  (${stats.correct} correct, ${stats.acceptable} acceptable, ${stats.scored} scored)`,
    );
  }
  console.log(`\nHallucinations: ${summary.totalHallucinations}`);
  console.log(`Usable without manual correction: ${summary.usableCount}/${summary.caseCount} (${summary.usablePct}%)`);

  const failed = results.some((r) => !r.usableWithoutCorrection) || statusMismatches.length > 0;
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

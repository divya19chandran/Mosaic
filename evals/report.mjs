// Combined eval report: live (fixture-backed, re-runnable) results plus
// historical (transcribed, unverified) results in one view.
//
// The two sources stay visually and numerically separate on purpose — see
// historical-cases.mjs's header comment for why blending them would hide
// exactly the distinction EVALS.md warns against losing. Only the live
// results are used to decide the process exit code; historical cases can't
// regress-test anything since there's no fixture to re-run, so gating CI on
// them would just be noise.
//
// Usage:
//   npm run evals:report                                (starts its own dev server)
//   npm run evals:report -- --url http://localhost:5199   (use an already-running server)

import { runLiveEvals } from './live-runner.mjs';
import { scoreCase, summarize } from './scoring.mjs';
import { historicalFieldCases, historicalPipelineFailures } from './historical-cases.mjs';

function parseArgs(argv) {
  const args = { url: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i];
  }
  return args;
}

function printCaseList(results, label) {
  console.log(`\n${label}`);
  console.log('-'.repeat(label.length));
  for (const r of results) {
    const verdict = r.usableWithoutCorrection ? 'PASS' : 'FAIL';
    const extra = r.meta.status ? ` (${r.meta.status})` : '';
    console.log(`${verdict}  ${r.id}${extra}`);
    for (const [field, v] of Object.entries(r.fields)) {
      if (v === null) continue;
      if (v !== 'correct' && v !== 'blank_correct') console.log(`      - ${field}: ${v}`);
    }
    if (r.meta.note) console.log(`      note: ${r.meta.note}`);
  }
}

function printSummary(summary, label) {
  console.log(`\n${label} per-field accuracy (correct + acceptable / scored):`);
  for (const [field, stats] of Object.entries(summary.perField)) {
    if (stats.scored === 0) continue;
    console.log(
      `  ${field.padEnd(12)} ${stats.accuracyPct}%  (${stats.correct} correct, ${stats.acceptable} acceptable, ${stats.scored} scored)`,
    );
  }
  console.log(`  Hallucinations: ${summary.totalHallucinations}`);
  console.log(`  Usable without manual correction: ${summary.usableCount}/${summary.caseCount} (${summary.usablePct}%)`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('Mosaic screenshot/link extraction — combined eval report');
  console.log('==========================================================');

  const { results: liveResults, statusMismatches } = await runLiveEvals({ url: args.url });
  const historicalResults = historicalFieldCases.map((c) =>
    scoreCase(c.id, c.expected, c.actual, { type: 'historical', status: c.status, note: c.note }),
  );

  printCaseList(liveResults, `LIVE cases (${liveResults.length}) — fixture-backed, re-run against the real app just now`);
  if (statusMismatches.length) {
    console.log('\nOCR status mismatches:');
    statusMismatches.forEach((m) => console.log(`  - ${m}`));
  }

  printCaseList(
    historicalResults,
    `HISTORICAL cases (${historicalResults.length}) — transcribed from real reports, UNVERIFIED (no saved fixture to re-run)`,
  );

  if (historicalPipelineFailures.length) {
    console.log(`\nHISTORICAL pipeline failures (${historicalPipelineFailures.length}) — OCR never ran, not a field-accuracy case`);
    console.log('-'.repeat(60));
    for (const f of historicalPipelineFailures) {
      console.log(`${f.id}  (${f.status})`);
      console.log(`      ${f.description}`);
      console.log(`      note: ${f.note}`);
    }
  }

  const liveSummary = summarize(liveResults);
  printSummary(liveSummary, 'LIVE');

  const historicalSummary = summarize(historicalResults);
  printSummary(historicalSummary, 'HISTORICAL (unverified — reference only, not a regression signal)');

  const allSummary = summarize([...liveResults, ...historicalResults]);
  printSummary(allSummary, 'ALL KNOWN CASES (live + historical combined — directional only, see caveats above)');

  console.log(
    `\nNote: pass/fail exit status is based on LIVE cases only — historical cases have no fixture to re-run and can't confirm or refute a fix, only record what was once reported.`,
  );

  // Only live results (and their OCR status checks) can meaningfully gate
  // CI — see module header comment.
  const failed = liveResults.some((r) => !r.usableWithoutCorrection) || statusMismatches.length > 0;
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

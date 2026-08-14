// Shared scoring logic for the screenshot/link autofill evals.
//
// Moves the eval suite from whole-case Pass/Fail toward the four dimensions
// laid out for this project: per-field accuracy, groundedness (does it
// invent values for fields that aren't actually in the source, or correctly
// leave them blank), ambiguity handling (some fields have more than one
// reasonable correct answer), and end-to-end usefulness (would a person
// have to manually fix this before it's usable).
//
// This module is pure/data-in-data-out on purpose — it doesn't know about
// Playwright or the DOM. `run.mjs` (live, automated cases) and
// `historical-cases.mjs` (transcribed real reports we can't re-run) both
// feed it the same shape of data so every case, live or historical, gets
// judged the same way and rolls up into one report.

const FIELD_NAMES = ['title', 'category', 'date', 'time', 'location', 'description'];

function norm(s) {
  return (s ?? '').toString().trim().toLowerCase();
}

function fuzzyMatches(actual, expected) {
  const a = norm(actual);
  const e = norm(expected);
  if (!a || !e) return false;
  return a.includes(e) || e.includes(a);
}

/**
 * Scores one field.
 *
 * `expectation` shape:
 *   { value: string, alternates?: string[], exact?: boolean, absent?: boolean }
 *   - absent: true means the source genuinely doesn't contain this info —
 *     the correct behavior is leaving the field blank. Filling in anything
 *     is a hallucination, not partial credit.
 *   - alternates: other values that would also be a reasonable read (e.g.
 *     "Grow" vs "Stay Creative" for a workshop that's arguably either) —
 *     matching one of these scores 'acceptable', not 'correct', so the
 *     report can still distinguish "nailed it" from "defensible but not
 *     what we'd have picked."
 *
 * Returns one of: 'correct' | 'acceptable' | 'wrong' | 'missed' |
 * 'blank_correct' | 'hallucinated' | null (field wasn't scored for this case).
 */
export function scoreField(actualValue, expectation) {
  if (!expectation) return null;
  const actual = (actualValue ?? '').toString().trim();

  if (expectation.absent) {
    return actual === '' ? 'blank_correct' : 'hallucinated';
  }

  const hasExpectation = expectation.value || (expectation.alternates && expectation.alternates.length);
  if (!hasExpectation) return null;

  if (actual === '') return 'missed';

  const isMatch = expectation.exact
    ? norm(actual) === norm(expectation.value)
    : fuzzyMatches(actual, expectation.value);
  if (isMatch) return 'correct';

  const altMatch = (expectation.alternates ?? []).some((alt) =>
    expectation.exact ? norm(actual) === norm(alt) : fuzzyMatches(actual, alt),
  );
  if (altMatch) return 'acceptable';

  return 'wrong';
}

/**
 * Scores a full case: `expected` is a map of field name -> expectation (see
 * scoreField), `actual` is a map of field name -> string value extracted by
 * the parser. Fields absent from `expected` simply aren't scored (e.g. the
 * format-robustness cases only care about title/date/time, not category or
 * location).
 */
export function scoreCase(id, expected, actual, meta = {}) {
  const fields = {};
  for (const name of FIELD_NAMES) {
    fields[name] = scoreField(actual[name], expected[name]);
  }

  const GOOD = new Set(['correct', 'acceptable', 'blank_correct']);
  const hallucinations = Object.entries(fields).filter(([, v]) => v === 'hallucinated').map(([k]) => k);

  // "Usable without manual correction" is the product-level question, not
  // the OCR-level one: could a person add this and walk away, or would they
  // have had to fix something first? A title is always required. Beyond
  // that, any field that has an expectation but didn't score as good means
  // a manual fix — including a "missed" field the person would need to
  // fill in by hand, and definitely including any hallucination.
  const scoredEntries = Object.entries(fields).filter(([, v]) => v !== null);
  const usableWithoutCorrection =
    fields.title != null &&
    GOOD.has(fields.title) &&
    hallucinations.length === 0 &&
    scoredEntries.every(([, v]) => GOOD.has(v));

  return {
    id,
    meta,
    fields,
    hallucinations,
    usableWithoutCorrection,
  };
}

/**
 * Rolls a list of scoreCase() results up into the headline numbers: per-field
 * accuracy (treating 'acceptable' as a hit, since it's a defensible answer,
 * but tracked separately so "correct" vs "acceptable" isn't hidden), total
 * hallucination count, and the % of cases usable without manual correction.
 */
export function summarize(results) {
  const perField = {};
  for (const name of FIELD_NAMES) {
    const scored = results.map((r) => r.fields[name]).filter((v) => v !== null);
    const correct = scored.filter((v) => v === 'correct' || v === 'blank_correct').length;
    const acceptable = scored.filter((v) => v === 'acceptable').length;
    perField[name] = {
      scored: scored.length,
      correct,
      acceptable,
      // "accuracy" counts correct + acceptable as a hit — a defensible
      // alternate answer isn't a bug — but the breakdown above still lets
      // you see how much of that accuracy is "exactly right" vs "close enough".
      accuracyPct: scored.length ? Math.round(((correct + acceptable) / scored.length) * 100) : null,
    };
  }

  const totalHallucinations = results.reduce((sum, r) => sum + r.hallucinations.length, 0);
  const usableCount = results.filter((r) => r.usableWithoutCorrection).length;

  return {
    caseCount: results.length,
    perField,
    totalHallucinations,
    usableCount,
    usablePct: results.length ? Math.round((usableCount / results.length) * 100) : null,
  };
}

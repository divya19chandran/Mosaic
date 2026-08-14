// Historical cases 001-004, transcribed from EVALS.md's manual Cases table
// into the same structured shape scoring.mjs's scoreCase() expects, so the
// same per-field / groundedness / ambiguity / usability lenses can be
// applied to them.
//
// These are NOT live, fixture-backed cases. The original screenshots that
// produced them were never saved to disk, so unlike everything under
// evals/fixtures/, there is no way to re-run these through the actual app —
// only to score what was written down at the time. That distinction matters
// enough that EVALS.md calls it out explicitly ("Keep the actual file" —
// see mosaic-evals-writeup.md for the case where skipping this bit us), so
// keep it visible here too: every result derived from this file must stay
// labeled `historical` and reported separately from live results, never
// silently merged into one number.
//
// Where the original report only said a field was "correct" without
// recording the raw extracted value, that raw value is unrecoverable — the
// expected value is reused as a stand-in for `actual` in that spot (called
// out per-case below) rather than inventing a plausible-looking fake one.

export const historicalFieldCases = [
  {
    id: '001',
    status: 'unfixed',
    note: 'Title fell back to a generic content-type label instead of the real event name; category had no social/live-event logic yet; location text was on-screen but never extracted. No code change has been made for this one yet.',
    expected: {
      title: { value: 'Free Charlie Puth Concert' },
      category: { value: 'Connect' },
      date: { value: '2026-08-06', exact: true },
      time: { value: '5:00 PM' },
      location: { value: "Hudson Yards' Public Square & Gardens" },
    },
    // date/time: the report only said "Date/Time: correct" without quoting
    // the raw extracted string, so the expected value stands in here.
    actual: {
      title: 'Posts',
      category: 'Stay Healthy',
      date: '2026-08-06',
      time: '5:00 PM',
      location: '',
    },
  },
  {
    id: '002',
    status: 'fixed-unverified',
    note: 'Title picked a garbled OCR fragment over the real headline; date/time were pulled from the first date/time-shaped match anywhere in the OCR blob rather than requiring both to come from the same line; a noisy first-pass match on just one of date/time skipped the tighter-cropped retry. Fixed in src/lib/autofill.ts (looksLikeGarbledOcr, combo date+time line matching) and src/lib/screenshot.ts (retry now requires both date and time). Verified only via a synthetic-OCR-text unit test reproducing the failure pattern — the real screenshot was never available to re-run through the live app.',
    expected: {
      title: { value: 'Non Visual Drawing Club' },
      // Grow vs Stay Creative is the project's own worked example of the
      // ambiguity-handling dimension (see EVALS.md category guidance).
      category: { value: 'Grow', alternates: ['Stay Creative'] },
      date: { value: '2026-08-08', exact: true },
      time: { value: '2:00 PM' },
      location: { value: 'Andrew Heiskell Braille and Talking Book Library' },
    },
    actual: {
      title: 'a | a it',
      category: 'Grow',
      date: '2026-08-29',
      time: '1:00 PM',
      location: '',
    },
  },
  {
    id: '003',
    status: 'fixed-unverified',
    note: 'Title picked up a garbled "From <name>" attribution overlay fragment; location came back blank because venue names (not just numbered street addresses) weren\'t recognized. Fixed in src/lib/autofill.ts (looksLikeGarbledOcr gained a stray-bracket/quote rule, new looksLikeAttributionLine check, guessLocationFromText gained a venue-keyword fallback). A description/notes auto-fill feature (guessDescriptionFromText) was also added right after this report, but never re-verified against this exact card, so it is deliberately left unscored below rather than assumed to work. Verified only via a synthetic-OCR-text unit test — the real screenshot was never available to re-run through the live app.',
    expected: {
      title: { value: 'Summer Reading Closing Festival: Bookbinding' },
      category: { value: 'Grow' },
      location: { value: 'Central Library' },
      // date/time: user didn't report these as wrong or right — not scored.
      // description: post-fix behavior for this card was never confirmed —
      // not scored, see note above.
    },
    actual: {
      title: '[rom " J',
      category: 'Grow',
      location: '',
    },
  },
];

// Case 004 is a pipeline crash (OCR never ran at all), not a wrong-field
// result — it doesn't fit the field-accuracy shape the way 001-003 do, so
// it's tracked separately rather than forced through scoreCase with mostly
// empty expectations.
export const historicalPipelineFailures = [
  {
    id: '004',
    description:
      'Screenshot upload never reached OCR results — the modal showed the generic "Couldn\'t read text from this image" error state, with Title/Category/Date/Time/Location all left empty and "Add to my list" disabled.',
    rootCause:
      "tesseract.js's loadImage.js read the raw uploaded File/Blob straight into its WASM (Leptonica) decoder rather than going through the browser's own createImageBitmap/canvas codec the rest of the app uses — stricter about image encodings, so a file that decoded fine everywhere else in the app could still make tesseract throw outright.",
    status: 'fixed-unverified',
    note: 'Fixed in src/lib/screenshot.ts by canvas-normalizing the image (createImageBitmap → re-encode to PNG on canvas) before handing it to tesseract, with console.error logging added around the OCR call. Stress-tested against 3 synthetic edge cases that probe this class of bug (see fmt-001..003 in evals/fixtures/) — all pass — but the original uploaded file was never saved, so the exact original trigger was never reproduced or confirmed fixed.',
  },
];

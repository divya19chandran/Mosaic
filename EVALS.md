# Screenshot / Link Extraction — Evals

Tracks real test cases for the "Add something to your list" screenshot and link parser
(`server/extractLink.js`, surfaced through `AddActivityForm.tsx`). Each row is a real
screenshot or link a person tried to add, what the parser *should* have produced, what it
actually produced, and what's wrong. Use this to catch regressions and guide fixes to the
extraction logic.

## How to add a case

1. Grab the screenshot/link that produced a wrong or incomplete result.
2. Fill in a new row below with what the fields *should* say.
3. Note every field that was wrong, not just the most obvious one.
4. Leave Status as `Fail` until the parser is fixed and re-tested, then flip to `Pass`.

**Keep the actual file.** A fix verified against a hand-typed simulation of what
you assume the OCR output looks like only ever validates that assumption — it
can't catch the gap between imagined noisy output and real noisy output (see
`mosaic-evals-writeup.md` for the case where this bit us directly). If a real
screenshot or file caused the failure, save it — e.g. into `evals/fixtures/`
alongside the automated cases below — instead of describing it from memory,
even if the immediate fix has to happen before the file's in hand.

## Scoring dimensions

Both the manual Cases table below and the automated fixtures are judged the same way,
via `evals/scoring.mjs`. Instead of a single whole-case Pass/Fail, each field on each
case gets one of these verdicts:

| Verdict | Meaning |
|---|---|
| `correct` | Matches the expected value. |
| `acceptable` | Matches one of the expectation's `alternates` — a defensible alternate read (e.g. category `Grow` vs `Stay Creative` for a workshop that's arguably either), not what we'd have picked but not wrong either. |
| `wrong` | Doesn't match the expected value or any alternate. |
| `missed` | Field was left blank, but the source image actually contained this information. |
| `blank_correct` | Field was left blank, and the source image genuinely doesn't contain this information — the *correct* behavior. |
| `hallucinated` | Field was filled in, but the source image genuinely doesn't contain this information — inventing a plausible-looking value from noise. |

This gives four things the old Pass/Fail verdict couldn't:

- **Per-field accuracy** — which specific fields are weak, not just "this case failed somehow."
- **Groundedness** — `blank_correct` vs `hallucinated` specifically tracks whether the parser invents
  values for information that isn't there, as opposed to just getting a present value wrong. See the
  "groundedness probes" below — synthetic fixtures built so the absence of a field is guaranteed by
  construction.
- **Ambiguity handling** — `acceptable` (via `alternates`) means a defensible alternate answer isn't
  scored the same as an outright miss, without hiding that it wasn't the primary pick either.
- **End-to-end usefulness** — `usableWithoutCorrection` per case (and the `usablePct` headline number)
  answers the product question directly: could a person add this and walk away, or would they have had
  to fix something first? A case only counts as usable if the title is good, there are zero
  hallucinations, and every scored field is `correct`, `acceptable`, or `blank_correct`.

## Category guidance (for judging "Expected Category")

- **Stay Healthy** — physical activity (workouts, sports, hikes)
- **Stay Creative** — making or expressing (art classes, writing, music-making)
- **Stay Peaceful** — low-stimulation, restorative (meditation, quiet walks, spas)
- **Grow** — learning/mastery (courses, talks, workshops)
- **Connect** — real-world relationships and shared experiences (concerts, parties, group
  hangouts, dates) — even when the activity itself (e.g. live music) overlaps with another
  category, classify by the *social* intent if that's the primary draw.

## Cases

| ID | Input | Expected Title | Expected Category | Expected Date/Time | Expected Location | Actual Result | Issues Found | Status |
|----|-------|-----------------|--------------------|----------------------|----------------------|----------------|----------------|--------|
| 001 | Screenshot of a social post: "Charlie Puth is headlining a free NYC concert this week" (Hudson Yards' Public Square & Gardens, Thu Aug 6, 5 PM) | Free Charlie Puth Concert | Connect | Thu, Aug 6, 2026 · 5 PM | Hudson Yards' Public Square & Gardens | Title: "Posts" · Category: Stay Healthy · Date/Time: correct · Location: blank (not populated) | 1) Title fell back to a generic content-type label ("Posts") instead of pulling the actual event/artist name from the post text. 2) Category defaulted to Stay Healthy instead of Connect — no logic yet for social/live-event framing. 3) Location text was present in the screenshot but never made it into the Location field. | Fail |
| 002 | Screenshot of an Instagram/TikTok-style event card: "Non Visual Drawing Club" at NYPL's Andrew Heiskell Braille and Talking Book Library, overlaid on a video with a status bar and engagement icons (like/comment/share) down the side | Non Visual Drawing Club | Grow (Stay Creative also reasonable) | Sat, Aug 8, 2026 · 2:00 PM | Andrew Heiskell Braille and Talking Book Library (NYPL) | Title: "a \| a it" · Category: Grow (correct) · Date: 08/29/2026 · Time: 1:00 PM · Location: blank | 1) Title picked a garbled OCR fragment (background/video noise) over the real headline — the letter-ratio check alone wasn't strict enough to reject short, disconnected junk. 2) Date and time were each pulled from the *first* date-/time-shaped match anywhere in the whole flattened OCR blob, with no requirement they came from the same part of the image — so unrelated numbers elsewhere (engagement counts, a duplicated retry-crop pass) could win over the real "Sat, Aug 8 · 2:00 PM" line. 3) A noisy first-pass OCR read that spuriously matched just one of date/time stopped the code from ever trying the tighter-cropped retry passes that might have read the real line cleanly. | Fixed — see `src/lib/autofill.ts` (`looksLikeGarbledOcr`, combo date+time line matching) and `src/lib/screenshot.ts` (retry now requires both date *and* time, not either). Verified via a synthetic-OCR-text unit test reproducing this failure pattern (the real screenshot file wasn't available on disk to re-run through the live pipeline) — **please re-try the actual screenshot in the app to confirm**, then flip this to Pass. |
| 003 | Screenshot of an event card: "Summer Reading Closing Festival: Bookbinding" at Central Library, with a "From \" J..."-style attribution overlay near the top and a description ("Bind your own book at this two-hour, step-by-step introduction to the art of hand bookbinding. Learn how to use basic bookbindin...") | Summer Reading Closing Festival: Bookbinding | Grow | Not reported by user (only Title/Description/Location were flagged as wrong) | Central Library | Title: "[rom \" J" · Category: Grow · Date: 08/29/2026 · Time: 1:00 PM · Location: blank (empty "Venue or address" placeholder) | 1) Title picked up a garbled fragment of what looks like a "From <name>" attribution overlay (stray bracket + floating quote + almost no real letters) — the refresh #1 garbled-OCR check only caught patterns with 2+ single-character tokens, and this fragment has just one ("J"), so it slipped through. 2) Location came back completely blank because `guessLocationFromText` only ever recognized numbered street addresses, never a bare venue/institution name like "Central Library" — the same underlying gap that (retroactively) also explains case 002's blank location. 3) There is currently no logic anywhere in the app to auto-populate a description/notes field from OCR text at all — the description mentioned in this report is a distinct, not-yet-built capability, not a bug in an existing one. | Fixed (title + location) — see `src/lib/autofill.ts`: `looksLikeGarbledOcr` gained a second rule (stray bracket/quote + ≤6 total letters), plus a new `looksLikeAttributionLine` check for "From/Posted by/Reposted from/Shared by/via ..." lines; `guessLocationFromText` gained a `VENUE_KEYWORD_RE` fallback (library, museum, park, hall, theater, etc., deliberately excluding ambiguous words like "club"/"school" that show up inside event names themselves). Verified via a 9-check synthetic-OCR-text unit test (the real screenshot file wasn't available on disk to re-run through the live pipeline) — **please re-try the actual screenshot in the app to confirm**, then flip this to Pass. **Update:** description auto-fill into the existing Notes field was added right after this case — see `guessDescriptionFromText` in `src/lib/autofill.ts`, wired into `AddActivityForm.tsx`'s Notes field the same way title/date/time/location are wired. For this card, Notes should now guess "Bind your own book at this two-hour, step-by-step introduction to the art of hand bookbinding. Learn how to use basic bookbindin..." — please confirm alongside the title/location re-test above. |
| 004 | Screenshot upload (appeared to be a saved photo, not a flyer/card) that never got as far as OCR results — the modal showed the outright *error* state, not a "found nothing" state | N/A (this is a failure-to-read bug, not a wrong-field bug) | N/A | N/A | N/A | Status message: "Couldn't read text from this image, but it's still attached — fill in the details below." · Title/Category/Date/Time/Location all empty · "Add to my list" left disabled | Root cause found by code reading, not by re-running the actual file (**the original image wasn't available on disk to re-test — see the caveat below**): `extractTextFromImage()` in `src/lib/screenshot.ts` passed the raw uploaded `File` straight to tesseract.js's `worker.recognize()`. Per `tesseract.js`'s own `loadImage.js`, a File/Blob source is read via `FileReader.readAsArrayBuffer` and handed to its WASM (Leptonica) decoder as raw bytes — it never goes through the browser's own `createImageBitmap`/canvas codec the way the rest of the app's image handling does. That WASM decoder is stricter about image encodings than a real browser, so a file that decodes fine everywhere else in the app (e.g. the thumbnail preview, which *did* show up in the user's screenshot) can still make tesseract throw outright, surfacing as this generic, uninformative error. | Fixed — `extractTextFromImage()` now decodes the file once via `createImageBitmap`, re-encodes it to a plain PNG on canvas, and feeds tesseract *that* instead of the raw File (falling back to the raw file only if the browser decode itself fails). Also added `console.error` logging around the OCR call so any future failure is visible in devtools instead of silently collapsing to the generic message. **Caveat: the user's original file was never available to re-test, so this is fixed against the identified architectural gap, not verified against the exact artifact that failed.** Stress-tested instead against three synthetic edge-case images (CMYK progressive JPEG, WebP, a very tall "long screenshot" JPEG) — see the Format & Size Robustness section below — all pass, but none of them happened to reproduce the *original* throw in this sandbox's headless Chromium either, so the true trigger is still unconfirmed. **If this happens again, please keep the actual uploaded file this time (Cancel the form rather than closing it) so it can be added as a permanent fixture** — see "How to add a case" above, now extended below. | Fixed (unverified against original artifact) |

Cases 001-004 above are also transcribed into `evals/historical-cases.mjs` in the same
per-field shape `evals/scoring.mjs` expects, so they show up in the combined report (see
below) with real per-field verdicts (`wrong`/`missed`/etc.) instead of just prose. That
file is explicitly *not* a fixture — the original screenshots were never saved, so there's
nothing to re-run — it's just this table's data made scoreable. Keep both in sync: if you
correct or re-verify a row here, update the matching entry there too.

## Format & Size Robustness and Groundedness (automated)

Separate from the field-accuracy cases above, this set stress-tests two different failure
modes entirely: not "did the parser guess the wrong title," but "did OCR run at all"
(format-robustness) and "did it invent a value for something that isn't actually there"
(groundedness). All fixtures below are **synthetic** — generated to probe a specific
failure mode, not reconstructions of a real reported failure — call that out explicitly
rather than implying they're equivalent to the Cases above (see the "keep the actual
file" note).

Unlike the manual Cases table, these run automatically:

```
npm run evals
```

This spins up its own throwaway dev server, drives the real app through Playwright,
uploads each fixture in `evals/fixtures/manifest.json`, and scores the resulting fields
with `evals/scoring.mjs` (see "Scoring dimensions" above) — printing PASS/FAIL per case
and exiting non-zero on any case that isn't usable without correction, or any OCR status
mismatch.

**Format robustness** — exists because case 004 surfaced a real architectural gap (raw
uploaded bytes bypass the browser's own image decoder on the way into tesseract) without
a way to reproduce the original throw, so this is the closest thing to a regression guard
until a real failing file turns up:

| ID | Fixture | What it stresses | Expected |
|----|---------|-------------------|----------|
| fmt-001 | `cmyk-progressive.jpg` | CMYK, progressive-encoded JPEG — decodes fine via browser canvas, historically a rough edge for WASM JPEG decoders | Title "Rooftop Movie Night", date 2026-08-15, time 7:30 PM, status `done` |
| fmt-002 | `webp-format.webp` | WebP — universally supported by browsers, not guaranteed in every WASM image library build | same as above |
| fmt-003 | `long-screenshot.jpg` | Very tall (1170×14000) image simulating a scrolling/long-screenshot capture — stresses decoders that allocate their full pixel buffer up front | same as above |

All three currently **pass** against the fix in `src/lib/screenshot.ts` (canvas-normalize
before handing the image to tesseract). Note that none of them reproduced the *original*
case 004 throw in this sandbox — they're a robustness net for this class of bug, not proof
the exact original trigger is covered.

**Groundedness** — probes built so the absence of a field is guaranteed by construction
(the source image genuinely doesn't contain that information anywhere), so the correct
behavior is leaving it blank rather than inventing a plausible-looking value:

| ID | Fixture | What it stresses | Expected |
|----|---------|-------------------|----------|
| gr-001 | `gr-001-no-date-no-location.jpg` | Title + description text only — no date, time, or location anywhere in the image | Title "Open Mic Poetry Night"; date/time/location all correctly blank |
| gr-002 | `gr-002-no-location.jpg` | Title + explicit date/time, but no venue name or address anywhere in the image | Title "Sunset Rooftop Yoga", date 2026-09-06, time 6:30 PM; location correctly blank |

Both currently **pass** with 0 hallucinations — the parser doesn't invent a date, time, or
location when the source doesn't contain one.

### Combined report (live + historical)

```
npm run evals:report
```

Runs the same live fixtures as `npm run evals`, then also scores the historical cases
in `evals/historical-cases.mjs`, and prints both side by side plus a combined "all known
cases" view — clearly labeled, never silently blended, since only the live section can
actually be re-run to confirm or refute a fix. The headline "usable without manual
correction" % is reported for each section separately. Process exit code is driven by the
live section only.

### Adding a new automated case

1. Drop the image file into `evals/fixtures/`.
2. Add an entry to `evals/fixtures/manifest.json` with an `id`, `file`, `type`
   (`"format-robustness"` or `"groundedness"`), `expectOcrStatus`, and an `expect` block —
   a map of field name (`title`/`category`/`date`/`time`/`location`/`description`) to an
   expectation object: `{ value }` for the expected value, `{ value, exact: true }` to
   require an exact match instead of a substring match, `{ value, alternates: [...] }` if
   more than one answer is defensible, or `{ absent: true }` if the source genuinely
   doesn't contain that field (the correct behavior is leaving it blank — see
   "groundedness" above).
3. Run `npm run evals` and confirm it reports PASS for the new case before committing it —
   an eval case that's never been seen to fail hasn't proven it can catch anything.
4. If the fixture is a real screenshot that caused a real reported failure (as opposed to a
   synthetic stress case like the three above), also log it in the manual Cases table above
   so the "what a person actually saw" narrative isn't lost — the two tables serve different
   purposes and both matter.

import type { CategoryId } from '../types';

/**
 * Shared "guess the details" helpers used by both entry paths in
 * AddActivityForm: pasting a link and uploading a screenshot. Both end up
 * with some raw text (a URL, or OCR output from an image) that we turn into
 * a title guess and a category guess. Everything here is a plain,
 * deterministic heuristic — no network calls, no AI model — so it works
 * offline and the person can always edit the result before saving.
 */

/**
 * Best-effort title guess from a pasted URL — no network fetch (a browser
 * can't reliably read another site's page title due to CORS), so this reads
 * the last path segment or falls back to the hostname.
 */
export function guessTitleFromUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] ?? '';
    const cleaned = last
      .replace(/\.\w{2,5}$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (cleaned.length > 2) {
      return titleCase(cleaned);
    }
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const WEEKDAY_OR_MONTH =
  /\b(mon|tue|tues|wed|thu|thurs|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i;

/**
 * Flyers/posts almost always lead with a date and/or time line (e.g.
 * "SAT AUG 2", "7:00 PM", "Saturday, August 2nd") before the actual event
 * name. Those lines are mostly letters too, so the plain letter-ratio check
 * below can't tell them apart from a real title on its own — this catches
 * the common date/time formats so they get skipped.
 */
function looksLikeDateOrTime(line: string): boolean {
  if (/\b\d{1,2}:\d{2}\s*(am|pm)?\b/i.test(line)) return true;
  if (/\b\d{1,2}\s*(am|pm)\b/i.test(line)) return true;
  const hasDateWord = WEEKDAY_OR_MONTH.test(line);
  const hasDayNumber = /\b\d{1,2}(st|nd|rd|th)?\b/.test(line);
  if (hasDateWord && (hasDayNumber || line.replace(/[^a-zA-Z]/g, '').length <= 10)) return true;
  return false;
}

/**
 * Common social-app UI chrome that OCR happily reads as "real" text but that
 * is never the actual title of whatever the person screenshotted — nav bar
 * labels, button text, engagement counts, etc. Matched against a line with
 * leading glyphs (back arrows, chevrons) and punctuation stripped, so "<
 * Saved" and "‹Saved" both match "saved".
 */
const UI_CHROME_LINES = new Set([
  'saved', 'ad', 'sponsored', 'promoted', 'sign up', 'log in', 'get tickets',
  'buy tickets', 'like', 'comment', 'share', 'send', 'follow', 'following',
  'message', 'view profile', 'view all', 'see more', 'more', 'reply',
]);

function stripLeadingChrome(line: string): string {
  return line.replace(/^[<>«»‹›◀▶→←\s]+/, '').trim();
}

/** A bare handle/domain-looking line, e.g. "souk.studio" or "@some_handle". */
function looksLikeHandle(line: string): boolean {
  return /^@?[\w.]+\.(studio|com|co|app|org|net|io)$/i.test(line) || /^@[\w.]+$/.test(line);
}

/**
 * Generic flyer banner phrases ("SAVE THE DATE", "RSVP") are often rendered
 * in a large, prominent font — sometimes as big as the actual event name —
 * so the bbox-height heuristic alone can't tell them apart from a real
 * title. These are common enough boilerplate that we can just name them.
 */
const FLYER_BANNER_PHRASES = new Set([
  'save the date', "you're invited", 'youre invited', 'rsvp', 'rsvp now',
  'save-the-date', 'mark your calendar', 'mark your calendars', 'the date',
]);

const STREET_RE =
  /\b\d{1,5}\s+[A-Za-z0-9.'\s]{2,40}?\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|pl|place|ct|court|sq|square)\b\.?/i;
const CITY_STATE_ZIP_RE = /\b[A-Za-z .]+,\s*[A-Z]{2}\s*\d{5}\b/;

/** A street address or city/state/zip line — never an event title. */
function looksLikeAddress(line: string): boolean {
  return STREET_RE.test(line) || CITY_STATE_ZIP_RE.test(line);
}

/**
 * Whether a line is plausibly part of a title: long enough, mostly letters,
 * not a date/time header, not UI chrome, not a bare handle/URL/number, not
 * an address, and not a generic flyer banner phrase. Shared by both the
 * plain-text fallback and the bbox-aware line scorer below, since both need
 * to reject the same kinds of non-title noise.
 */
function isTitleCandidateLine(rawLine: string): boolean {
  const line = stripLeadingChrome(rawLine);
  if (line.length < 3 || line.length > 90) return false;
  if (/^https?:\/\//i.test(line)) return false;
  if (/^\d+$/.test(line)) return false; // bare engagement counts, etc.
  if (UI_CHROME_LINES.has(line.toLowerCase())) return false;
  if (FLYER_BANNER_PHRASES.has(line.toLowerCase())) return false;
  if (looksLikeHandle(line)) return false;
  if (looksLikeAddress(line)) return false;
  if (looksLikeDateOrTime(line)) return false;
  if (looksLikeGarbledOcr(line)) return false;
  if (looksLikeAttributionLine(line)) return false;
  const letters = (line.match(/[a-zA-Z]/g) ?? []).length;
  return letters >= line.length * 0.4;
}

/**
 * Catches OCR noise that still slips past the letter-ratio check above —
 * e.g. a busy photo/video background misread as text produces short,
 * disconnected fragments like "a | a it" rather than real words. Two
 * patterns of this noise show up often enough in practice to check for
 * directly:
 *
 * 1. Mostly single-character "words" ("a | a it"). Real titles are almost
 *    never made up mostly of single-character tokens: a genuine short title
 *    ("It Girl", "Y2K Night") has at most one, and even abbreviation-heavy
 *    titles don't stack them back to back.
 * 2. A stray unmatched bracket or floating quote mark next to only a
 *    handful of real letters ("[rom \" J") — brackets/quotes show up in OCR
 *    noise from icon glyphs and UI decoration far more than they show up as
 *    the *first* punctuation in an actual title, and a real title with that
 *    little total letter content plus that kind of stray punctuation is
 *    vanishingly rare.
 */
function looksLikeGarbledOcr(line: string): boolean {
  const tokens = line
    .split(/[\s|•·]+/)
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  if (tokens.length < 2) return false;

  const singleCharTokens = tokens.filter((t) => t.length === 1).length;
  if (singleCharTokens >= 2 && singleCharTokens / tokens.length >= 0.5) return true;

  const totalLetters = tokens.join('').replace(/[^a-zA-Z]/g, '').length;
  const hasStrayBracketOrQuote = /[[\]]/.test(line) || /(^|\s)"(\s|$)/.test(line);
  if (hasStrayBracketOrQuote && totalLetters <= 6) return true;

  return false;
}

/**
 * "From <name>", "Posted by <name>", "Reposted from <name>" — attribution
 * lines that social apps render right on the card/overlay, often in a size
 * comparable to (or bigger than) the real event name. Kept as a dedicated
 * check (rather than folded into UI_CHROME_LINES, which only matches whole
 * lines exactly) since the name after "From"/"by" is different every time.
 */
function looksLikeAttributionLine(line: string): boolean {
  return /^(from|posted by|reposted from|shared by|via)\b/i.test(line.trim()) && line.length <= 40;
}

/**
 * Best-effort title guess from raw OCR text pulled off a screenshot, used
 * when line-level bounding-box data isn't available. Picks the first line
 * that looks title-like (see isTitleCandidateLine). Falls back to the first
 * non-empty line so the field is never silently left blank.
 */
export function guessTitleFromText(rawText: string): string {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const candidate = lines.find(isTitleCandidateLine);
  return candidate ? stripLeadingChrome(candidate) : lines[0] ?? '';
}

/**
 * Best-effort title guess using OCR line heights (see lib/screenshot.ts).
 * Flyers and social graphics almost always render the event name in the
 * biggest text on the image — much bigger than nav chrome, handles, captions,
 * or button labels — so this filters out obvious noise first (the same
 * filters guessTitleFromText uses), then finds the tallest remaining line and
 * merges it with any immediately-adjacent lines of a similar height, to
 * reconstruct titles that got OCR'd as several stacked lines (e.g. "TALKING"
 * / "ABOUT" / "THE GITA" on three lines of one big headline).
 *
 * Falls back to guessTitleFromText(fullText) if there's no usable line data
 * (e.g. OCR found no text blocks at all).
 */
export function guessTitleFromLines(lines: { text: string; height: number }[], fullText: string): string {
  const candidates = lines
    .map((l) => ({ ...l, text: stripLeadingChrome(l.text) }))
    .filter((l) => isTitleCandidateLine(l.text));

  if (candidates.length === 0) return guessTitleFromText(fullText);

  const maxHeight = Math.max(...candidates.map((l) => l.height));
  const threshold = maxHeight * 0.9;

  const parts: string[] = [];
  let inCluster = false;
  for (const l of candidates) {
    const isBig = l.height >= threshold;
    if (isBig) {
      parts.push(l.text);
      inCluster = true;
    } else if (inCluster) {
      break; // left the first contiguous run of big/headline-sized lines
    }
  }

  let merged = parts.join(' ').trim();

  // Guard against over-merging: if OCR only ever picked up a handful of
  // similarly-sized lines (e.g. it missed the actual headline and all
  // that's left are banner/venue-name-sized lines within 10% of each
  // other), a big cluster here is a sign we're stitching unrelated lines
  // together rather than reconstructing one real stacked headline. Fall
  // back to just the single tallest line in that case.
  if (parts.length > 3 || merged.length > 60) {
    const tallest = candidates.reduce((best, l) => (l.height > best.height ? l : best), candidates[0]);
    merged = tallest.text;
  }

  return (merged || candidates[0].text).trim();
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const MONTHS3: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DATE_RE =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;

function yearForMonthDay(month: number, day: number): number {
  const now = new Date();
  let year = now.getFullYear();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (new Date(year, month - 1, day) < today) year += 1;
  return year;
}

/**
 * Month names/abbreviations for the fuzzy fallback scanner below. Kept
 * separate from MONTHS3 (used by the fast-path regex) since this list needs
 * both the full name and abbreviation available per month to check against.
 */
const MONTH_NAMES: { num: number; names: string[] }[] = [
  { num: 1, names: ['january', 'jan'] },
  { num: 2, names: ['february', 'feb'] },
  { num: 3, names: ['march', 'mar'] },
  { num: 4, names: ['april', 'apr'] },
  { num: 5, names: ['may'] },
  { num: 6, names: ['june', 'jun'] },
  { num: 7, names: ['july', 'jul'] },
  { num: 8, names: ['august', 'aug'] },
  { num: 9, names: ['september', 'sept', 'sep'] },
  { num: 10, names: ['october', 'oct'] },
  { num: 11, names: ['november', 'nov'] },
  { num: 12, names: ['december', 'dec'] },
];

/** True if two same-ish-length strings differ by at most one character (substitution/insertion/deletion). */
function editDistanceAtMost1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    return diff <= 1;
  }
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
    } else {
      diff++;
      j++;
      if (diff > 1) return false;
    }
  }
  return true;
}

/**
 * Checks whether a token's leading alphabetic run names a month, tolerating
 * a single OCR letter-substitution error (e.g. "AUCUST" for "AUGUST",
 * misread G→C — the kind of thing a bold, tightly-kerned flyer banner font
 * produces often enough to matter). Returns the month number and how many
 * characters of the token the month name/abbreviation consumed, so the
 * caller can look at whatever's left in (or right after) the token for the
 * day number — this also covers OCR merging "AUGUST" and "16TH" into one
 * token with no space, which a plain regex requiring \s+ between them can't
 * match at all.
 */
function fuzzyFindMonth(token: string): { num: number; len: number } | undefined {
  const alphaMatch = token.match(/^[A-Za-z]+/);
  if (!alphaMatch) return undefined;
  const w = alphaMatch[0].toLowerCase();
  if (w.length < 3) return undefined;

  for (const { num, names } of MONTH_NAMES) {
    for (const name of names) {
      // Cap the consumed length at the matched name's own length (never the
      // full alpha run) — otherwise a stray digit-confusable letter right
      // after the month name (e.g. the "l" in OCR's "AUCUSTl6TH" misreading
      // both "AUGUST" and the leading "1" of "16TH") gets swallowed into the
      // month match and leaves the wrong digits behind for the day.
      if (w === name || w.startsWith(name)) return { num, len: name.length };
      const cmpLen = Math.min(w.length, name.length);
      if (cmpLen >= 3 && editDistanceAtMost1(w.slice(0, cmpLen), name.slice(0, cmpLen))) {
        return { num, len: cmpLen };
      }
    }
  }
  return undefined;
}

/**
 * Pulls a 1–31 day number off the front of a token, tolerating the OCR
 * letter/digit mix-ups that show up in ordinal suffixes on flyer text (e.g.
 * "l6th" or "I6th" for "16th", where a bold sans-serif font renders 1 and
 * capital I/lowercase l nearly identically).
 */
function parseOrdinalDay(raw: string): number | undefined {
  const stripped = raw.replace(/^[.,\s]+/, '').slice(0, 4);
  if (!stripped) return undefined;
  const normalized = stripped.replace(/[oO]/g, '0').replace(/[lI]/g, '1');
  const m = normalized.match(/^(\d{1,2})/);
  if (!m) return undefined;
  const day = parseInt(m[1], 10);
  if (!day || day < 1 || day > 31) return undefined;
  return day;
}

/**
 * Fallback date scanner used when the fast DATE_RE regex finds nothing —
 * walks the text token by token looking for a (possibly misread) month name,
 * then a day number either merged into the same token or in one of the next
 * couple tokens. Slower and more permissive than DATE_RE on purpose: it's
 * only reached after the strict pass already came up empty, so the added
 * tolerance for OCR noise is worth the (small) extra false-positive risk —
 * and a false match still just pre-fills a date picker the person reviews
 * before saving, never something applied silently.
 */
function fuzzyGuessDate(flat: string): string | undefined {
  const tokens = flat.split(/\s+/).filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const monthMatch = fuzzyFindMonth(tokens[i]);
    if (!monthMatch) continue;

    let dayStr = tokens[i].slice(monthMatch.len);
    let daySourceEnd = i + 1;
    if (!/\d/.test(dayStr)) {
      dayStr = '';
      for (let j = i + 1; j < Math.min(i + 3, tokens.length); j++) {
        if (/\d/.test(tokens[j])) {
          dayStr = tokens[j];
          daySourceEnd = j + 1;
          break;
        }
        if (!/^[.,]+$/.test(tokens[j])) break; // only skip over bare punctuation tokens
      }
    }

    const day = parseOrdinalDay(dayStr);
    if (day === undefined) continue; // not a real date here — keep scanning

    let year: number | undefined;
    for (let j = daySourceEnd; j < Math.min(daySourceEnd + 2, tokens.length); j++) {
      const y = tokens[j].match(/\b(20\d{2})\b/);
      if (y) {
        year = parseInt(y[1], 10);
        break;
      }
    }

    const resolvedYear = year ?? yearForMonthDay(monthMatch.num, day);
    return `${resolvedYear}-${String(monthMatch.num).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return undefined;
}

/**
 * Best-effort "YYYY-MM-DD" guess from OCR'd flyer text, e.g. pulls
 * 2026-08-16 out of "SUNDAY AUGUST 16TH, 5:30PM - 8:00PM". Most flyers don't
 * print a year, so when one isn't found this assumes the nearest occurrence
 * of that month/day that hasn't already passed (the same assumption a person
 * skimming an undated flyer would make) — this is a guess, always shown to
 * the person via the date picker before saving, never applied silently.
 *
 * Tries a strict regex first (cheap, no false positives on clean text), and
 * only falls back to a more tolerant token-by-token scan if that finds
 * nothing — covers real-world OCR noise on bold flyer/banner fonts: a
 * month+day merged into one word with no space, or a single misread letter
 * in the month name or day suffix.
 */
export function guessDateFromText(rawText: string): string | undefined {
  const comboLine = findComboDateTimeLine(rawText);
  if (comboLine) {
    const parsed = parseDateFromLine(comboLine);
    if (parsed) return parsed;
  }

  const flat = rawText.replace(/\n/g, ' ');
  const match = flat.match(DATE_RE);
  if (match) {
    const month = MONTHS3[match[1].toLowerCase().slice(0, 3)];
    const day = parseInt(match[2], 10);
    if (month && day && day >= 1 && day <= 31) {
      const year = match[3] ? parseInt(match[3], 10) : yearForMonthDay(month, day);
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return fuzzyGuessDate(flat);
}

function parseDateFromLine(line: string): string | undefined {
  const match = line.match(DATE_RE);
  if (!match) return undefined;
  const month = MONTHS3[match[1].toLowerCase().slice(0, 3)];
  const day = parseInt(match[2], 10);
  if (!month || !day || day < 1 || day > 31) return undefined;
  const year = match[3] ? parseInt(match[3], 10) : yearForMonthDay(month, day);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Event cards (Instagram/TikTok-style overlays especially) almost always
 * print the date and time together on one line — "Sat, Aug 8 · 2:00 PM".
 * When OCR text gets flattened across the whole image (see guessDateFromText
 * / guessTimeFromText below), that correlation is lost: a date-shaped or
 * time-shaped fragment from somewhere else entirely (an engagement count, a
 * duplicated retry-band pass, a video timestamp) can win a bare "first
 * match anywhere" scan even though it has nothing to do with the real date.
 * Finding a single OCR line that contains *both* a date and a time first —
 * and reading both values from that one line — is a much higher-confidence
 * signal, since it can only match text that was genuinely printed together.
 * Falls through to the old whole-text scan when no such line exists (e.g.
 * flyers that print the date and time on separate lines).
 */
function findComboDateTimeLine(rawText: string): string | undefined {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.find((l) => DATE_RE.test(l) && (TIME_RANGE_RE.test(l) || TIME_SINGLE_RE.test(l)));
}

const TIME_RANGE_RE =
  /(\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)/i;
const TIME_SINGLE_RE = /\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?/i;

function normalizeTime(raw: string): string {
  return raw
    .replace(/\./g, '')
    .replace(/\s+/g, '')
    .replace(/([ap])m$/i, ' $1M')
    .toUpperCase()
    .trim();
}

/**
 * Best-effort time (or time range) guess from OCR'd flyer text, e.g. pulls
 * "5:30 PM – 8:00 PM" out of "SUNDAY AUGUST 16TH, 5:30PM - 8:00PM".
 */
export function guessTimeFromText(rawText: string): string | undefined {
  const comboLine = findComboDateTimeLine(rawText);
  if (comboLine) {
    const range = comboLine.match(TIME_RANGE_RE);
    if (range) return `${normalizeTime(range[1])} – ${normalizeTime(range[2])}`;
    const single = comboLine.match(TIME_SINGLE_RE);
    if (single) return normalizeTime(single[0]);
  }

  const flat = rawText.replace(/\n/g, ' ');
  const range = flat.match(TIME_RANGE_RE);
  if (range) return `${normalizeTime(range[1])} – ${normalizeTime(range[2])}`;
  const single = flat.match(TIME_SINGLE_RE);
  return single ? normalizeTime(single[0]) : undefined;
}

const FLOOR_SUITE_RE = /\b(floor|fl\.?|suite|ste\.?)\b/i;

/**
 * Institution/venue-name words. A great many real-world event cards name
 * the venue ("Central Library", "Andrew Heiskell Braille and Talking Book
 * Library", "Madison Square Garden") without ever printing a numbered
 * street address on the card at all — the address-only STREET_RE/
 * CITY_STATE_ZIP_RE checks below miss these entirely, which is why the
 * location field came back blank on two different real screenshots that
 * both named a library by name rather than by street address.
 */
// Deliberately excludes a few venue-ish words ("club", "school") that are
// common inside *event/group names themselves* ("Non Visual Drawing Club",
// "Sunday Running Club", "Film School Meetup") — including them caused the
// venue fallback below to grab the title line instead of the real venue on
// exactly that kind of card.
const VENUE_KEYWORD_RE =
  /\b(library|center|centre|hall|park|museum|theater|theatre|gallery|studio|gym|church|temple|synagogue|mosque|hospital|university|stadium|arena|plaza|square|gardens?|cafe|café|restaurant|hotel|auditorium|complex|building|academy|institute)\b/i;

/**
 * Best-effort venue/address guess from OCR'd flyer text. Tries a street
 * address first ("123 Main St") — if found, that's the higher-confidence
 * signal, and pulls in the very next line too when it looks like a
 * continuation (floor/suite, or city+state+zip). Falls back to the first
 * line that names a recognizable venue/institution by keyword (see
 * VENUE_KEYWORD_RE) when no street address is present, since that's
 * extremely common on social-app event cards. Known limitation: this
 * fallback doesn't cross-check against whatever guessTitleFromLines picked
 * as the title, so an event *named* after a place-type word (e.g. "Garden
 * Party") could in principle be misread as a location — acceptable for a
 * best-effort guess the person reviews before saving, but worth revisiting
 * if it shows up in practice.
 */
export function guessLocationFromText(rawText: string): string | undefined {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const idx = lines.findIndex((l) => STREET_RE.test(l));
  if (idx !== -1) {
    const parts = [lines[idx]];
    const next = lines[idx + 1];
    if (next && !CITY_STATE_ZIP_RE.test(lines[idx]) && (FLOOR_SUITE_RE.test(next) || CITY_STATE_ZIP_RE.test(next))) {
      parts.push(next);
    }
    return parts.join(', ').replace(/,\s*,/g, ',').trim();
  }

  const venueLine = lines.find(
    (l) => VENUE_KEYWORD_RE.test(l) && l.length >= 3 && l.length <= 80 && !looksLikeDateOrTime(l)
  );
  return venueLine ? stripLeadingChrome(venueLine) : undefined;
}

const MIN_DESCRIPTION_LENGTH = 25;
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Best-effort description guess from OCR'd flyer/card text, used to pre-fill
 * the Notes field the same way title/date/time/location are pre-filled —
 * this was previously the one field the screenshot flow left untouched, even
 * though a "Notes" field already existed for the person to type into by
 * hand. Event cards almost always carry one block of real-sentence body
 * copy (the blurb under the headline) that's meaningfully longer than the
 * title, venue, or any UI chrome — so among lines that pass the same
 * noise/chrome filters used elsewhere in this file, the longest one still
 * standing is a reasonable guess. Requires a minimum length and an actual
 * space (i.e. more than one word) so a stray short label doesn't win by
 * default when no real description line is present, and excludes whatever
 * line was just used as the title so the two fields don't end up identical.
 */
export function guessDescriptionFromText(rawText: string, title?: string): string | undefined {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const normalizedTitle = title ? stripLeadingChrome(title).trim().toLowerCase() : undefined;

  const candidates = lines
    .map((l) => stripLeadingChrome(l))
    .filter((l) => {
      if (l.length < MIN_DESCRIPTION_LENGTH || l.length > MAX_DESCRIPTION_LENGTH) return false;
      if (!l.includes(' ')) return false; // a real description is more than one word
      if (normalizedTitle && l.toLowerCase() === normalizedTitle) return false;
      if (UI_CHROME_LINES.has(l.toLowerCase())) return false;
      if (FLYER_BANNER_PHRASES.has(l.toLowerCase())) return false;
      if (looksLikeHandle(l)) return false;
      if (looksLikeAddress(l)) return false;
      if (looksLikeDateOrTime(l)) return false;
      if (looksLikeGarbledOcr(l)) return false;
      if (looksLikeAttributionLine(l)) return false;
      const letters = (l.match(/[a-zA-Z]/g) ?? []).length;
      return letters >= l.length * 0.5;
    });

  if (candidates.length === 0) return undefined;

  return candidates.reduce((best, l) => (l.length > best.length ? l : best), candidates[0]);
}

/**
 * Keyword → category map for the auto-categorize heuristic. Generic
 * class/workshop-type words are kept out of "creative" specifically so a
 * more distinctive word (like "pottery" or "yoga") wins ties; those generic
 * words fall under "grow" as a catch-all for structured learning content.
 */
const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  healthy: [
    'run', 'running', 'yoga', 'gym', 'fitness', 'workout', 'hike', 'hiking',
    'bike', 'biking', 'cycling', 'swim', 'swimming', 'boxing', 'dance',
    'dancing', 'pilates', 'marathon', 'bootcamp', 'spin', 'sport', 'trail',
    'crossfit', 'climb', 'climbing',
  ],
  creative: [
    'paint', 'painting', 'pottery', 'ceramics', 'craft', 'drawing', 'sketch',
    'music', 'concert', 'gig', 'photography', 'sculpture', 'knit', 'sewing',
    'poetry', 'watercolor', 'open mic', 'art show', 'gallery', 'film',
  ],
  peaceful: [
    'meditat', 'mindful', 'breathwork', 'sound bath', 'retreat', 'spa',
    'quiet', 'calm', 'stillness', 'journaling', 'tea ceremony', 'sunrise',
    'sunset', 'yin yoga', 'restorative',
  ],
  grow: [
    'lecture', 'seminar', 'course', 'book club', 'language', 'study', 'talk',
    'panel', 'workshop', 'class', 'lesson', 'astrophotography', 'documentary',
  ],
  connect: [
    'mixer', 'social', 'meetup', 'potluck', 'volunteer', 'networking',
    'singles', 'community', 'board game', 'happy hour', 'party', 'gathering',
    'neighbors',
  ],
};

/**
 * Scores each category by counting keyword hits in the given text and
 * returns the best match, or undefined if nothing matched (in which case
 * the person just picks a category themselves).
 */
export function guessCategory(text: string): CategoryId | undefined {
  const lower = text.toLowerCase();
  let best: CategoryId | undefined;
  let bestScore = 0;

  (Object.keys(CATEGORY_KEYWORDS) as CategoryId[]).forEach((cat) => {
    const score = CATEGORY_KEYWORDS[cat].reduce((sum, kw) => sum + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  });

  return bestScore > 0 ? best : undefined;
}

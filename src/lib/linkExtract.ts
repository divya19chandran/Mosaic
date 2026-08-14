/**
 * Client-side wrapper around the `/api/extract-link` endpoint (served by
 * `vite.config.ts`'s dev middleware locally, and by `server/index.js` in
 * production). A plain browser `fetch()` can't read another site's page
 * content directly — that's blocked by CORS for virtually every third-party
 * site — so the actual page fetch happens server-side; this module just
 * calls our own backend and reshapes what it returns into the same
 * date/time string shapes the rest of the form already expects (see
 * lib/autofill.ts's guessDateFromText/guessTimeFromText output formats).
 */

export interface LinkMetadata {
  title?: string;
  description?: string;
  date?: string; // "YYYY-MM-DD", matches the <input type="date"> value shape
  time?: string; // e.g. "5:30 PM – 8:00 PM"
  location?: string;
}

interface RawLinkResponse {
  title?: string;
  description?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  error?: string;
}

/**
 * Pulls the date and start/end time directly out of an ISO 8601 string via
 * regex, rather than `new Date(iso).getHours()` etc. `new Date` would
 * convert the instant into the *browser's* local timezone, but what we want
 * here is the *event's own* local wall-clock time as the source page
 * published it (e.g. "2026-08-16T17:30:00-04:00" should read as 5:30 PM on
 * Aug 16, regardless of what timezone the person filling out this form is
 * currently in).
 */
function parseIsoLocal(iso: string): { date?: string; hh?: number; mm?: number } {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return {};
  const [, y, mo, d, h, mi] = m;
  return { date: `${y}-${mo}-${d}`, hh: Number(h), mm: Number(mi) };
}

function formatTime12(hh: number, mm: number): string {
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  const minuteStr = mm.toString().padStart(2, '0');
  return `${hour12}:${minuteStr} ${period}`;
}

function deriveDateTime(startDate?: string, endDate?: string): { date?: string; time?: string } {
  if (!startDate) return {};
  const start = parseIsoLocal(startDate);
  if (!start.date || start.hh === undefined || start.mm === undefined) return { date: start.date };

  const startLabel = formatTime12(start.hh, start.mm);
  const end = endDate ? parseIsoLocal(endDate) : {};
  if (end.hh !== undefined && end.mm !== undefined) {
    return { date: start.date, time: `${startLabel} \u2013 ${formatTime12(end.hh, end.mm)}` };
  }
  return { date: start.date, time: startLabel };
}

/** Strips a common `" | SiteName"` / `" - SiteName"` suffix some og:title
 * values include (e.g. "Talking About the Gita | Partiful" -> "Talking
 * About the Gita"). Only strips short trailing segments so it doesn't
 * mangle a real title that happens to contain a dash or pipe. */
function cleanTitle(title?: string): string | undefined {
  if (!title) return undefined;
  const trimmed = title.trim();
  const m = trimmed.match(/^(.*\S)\s+[|\u2013-]\s+(\S.{0,30})$/);
  if (m && m[2].length < m[1].length) return m[1];
  return trimmed;
}

/**
 * Asks our own server to fetch `url` and read back whatever event metadata
 * it published (Open Graph tags / JSON-LD Event data). Returns `undefined`
 * on any failure (network error, non-HTML page, no metadata found, etc.) so
 * callers can silently fall back to the existing URL-slug guess — a page
 * not publishing rich metadata is an expected, common case, not an error
 * worth surfacing to the person filling out the form.
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata | undefined> {
  try {
    const res = await fetch(`/api/extract-link?url=${encodeURIComponent(url)}`);
    if (!res.ok) return undefined;
    const data: RawLinkResponse = await res.json();
    if (data.error) return undefined;

    const { date, time } = deriveDateTime(data.startDate, data.endDate);
    const result: LinkMetadata = {
      title: cleanTitle(data.title),
      description: data.description,
      date,
      time,
      location: data.location,
    };
    const hasAnyField = Object.values(result).some((v) => v !== undefined);
    return hasAnyField ? result : undefined;
  } catch {
    return undefined;
  }
}

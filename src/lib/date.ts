/**
 * Shared helpers for the single-day calendar filter on Explore.
 *
 * Dates are stored as plain "YYYY-MM-DD" strings (what an <input type="date">
 * gives you), which — unlike most date formats — compare correctly with
 * plain string comparison, so no Date-object math is needed for range checks.
 */

/**
 * Whether an item with an optional [dateStart, dateEnd] range should show
 * when `selected` (a "YYYY-MM-DD" string, or '' for "no filter active") is
 * the active calendar filter.
 *
 * - No filter active → always show.
 * - Item has no dateStart at all (vague/recurring/unknown, e.g. "Multiple
 *   dates" or a manually-added activity with no date) → always show; we
 *   can't say it doesn't match a specific day we don't actually know.
 * - Otherwise → show only if `selected` falls within the range (a single
 *   day just has dateStart === dateEnd).
 */
export function matchesDate(selected: string, dateStart?: string, dateEnd?: string): boolean {
  if (!selected) return true;
  if (!dateStart) return true;
  const end = dateEnd || dateStart;
  return selected >= dateStart && selected <= end;
}

/**
 * Turns a "YYYY-MM-DD" string into a friendly label like "Sat, Aug 2, 2026"
 * for display, matching the style of the free-text dates already used
 * elsewhere (e.g. on Discover cards).
 */
export function formatDateLabel(iso: string): string {
  try {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

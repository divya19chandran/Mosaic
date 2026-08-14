/**
 * Pure month-grid helpers for CalendarPage. No React, no app state — just
 * date math — so it's easy to test/reason about on its own. Mirrors the
 * shape of the `buildMonthGrid()` pattern already used elsewhere in the
 * Almanac app (Mysore timeline, Learning calendar), reimplemented here
 * since this is a separate React/TS codebase with no shared module between
 * the two apps yet.
 */

export interface CalendarDay {
  iso: string; // "YYYY-MM-DD"
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Builds a Monday-start 6-row (42-day) grid for the given year/month (month
 * is 0-indexed, matching Date's convention), including the trailing/leading
 * days from the adjacent months needed to fill whole weeks.
 */
export function buildMonthMatrix(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1);
  // Date#getDay() is 0=Sunday..6=Saturday; convert to a Monday-start offset.
  const firstWeekday = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstWeekday);

  const todayISO = toISO(new Date());
  const weeks: CalendarDay[][] = [];
  let cursor = new Date(gridStart);

  for (let week = 0; week < 6; week++) {
    const row: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = toISO(cursor);
      row.push({
        iso,
        dayOfMonth: cursor.getDate(),
        inCurrentMonth: cursor.getMonth() === month,
        isToday: iso === todayISO,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Every "YYYY-MM-DD" from dateStart through dateEnd (inclusive), single day if dateEnd is unset. */
export function expandDateRange(dateStart: string, dateEnd?: string): string[] {
  const end = dateEnd || dateStart;
  if (end <= dateStart) return [dateStart];
  const out: string[] = [];
  let cursor = new Date(`${dateStart}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  // Guard against runaway loops from malformed data — a multi-day hobby
  // activity spanning more than ~2 months almost certainly means bad input.
  let guard = 0;
  while (cursor <= endDate && guard < 62) {
    out.push(toISO(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    guard++;
  }
  return out;
}

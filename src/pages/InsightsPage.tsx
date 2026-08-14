import { useMemo } from 'react';
import { useMyActivities } from '../hooks/useMyActivities';
import { CATEGORIES } from '../data/categories';
import type { Activity } from '../types';

const WEEKS_SHOWN = 8;

/** Monday-aligned start-of-week for a given date, as a "YYYY-MM-DD" key. */
function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function weekKey(date: Date): string {
  return weekStart(date).toISOString().slice(0, 10);
}

function shortWeekLabel(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildWeeklyCounts(activities: Activity[]): { key: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const a of activities) {
    const key = weekKey(new Date(a.addedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const weeks: { key: string; label: string; count: number }[] = [];
  const thisWeek = weekStart(new Date());
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    weeks.push({ key, label: shortWeekLabel(key), count: counts.get(key) ?? 0 });
  }
  return weeks;
}

function currentStreakWeeks(weekly: { count: number }[]): number {
  let streak = 0;
  for (let i = weekly.length - 1; i >= 0; i--) {
    if (weekly[i].count > 0) streak++;
    else break;
  }
  return streak;
}

export default function InsightsPage() {
  const { activities } = useMyActivities();

  const weekly = useMemo(() => buildWeeklyCounts(activities), [activities]);
  const streak = useMemo(() => currentStreakWeeks(weekly), [weekly]);
  const maxWeekly = Math.max(1, ...weekly.map((w) => w.count));

  const todayISO = new Date().toISOString().slice(0, 10);
  const upcoming = activities.filter((a) => {
    const end = a.dateEnd || a.dateStart;
    return !!end && end >= todayISO;
  }).length;
  const past = activities.filter((a) => {
    const end = a.dateEnd || a.dateStart;
    return !!end && end < todayISO;
  }).length;
  const undated = activities.length - upcoming - past;

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of activities) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    return CATEGORIES.map((c) => ({ ...c, count: counts.get(c.id) ?? 0 })).sort((a, b) => b.count - a.count);
  }, [activities]);
  const maxCategory = Math.max(1, ...categoryCounts.map((c) => c.count));

  if (activities.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
          Insights
        </div>
        <h1 className="text-[26px] font-bold leading-tight text-[color:var(--color-ink)]">
          Nothing to show yet
        </h1>
        <p className="max-w-md text-[13.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
          Add a few activities in Explore and this page will fill in with counts, streaks, and trends.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 pb-10">
      <div>
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
          Insights
        </div>
        <h1 className="text-[26px] font-bold leading-tight text-[color:var(--color-ink)]">
          How you've been spending your time
        </h1>
      </div>

      {/* Simple counts & streaks */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="Total activities" value={activities.length} />
        <StatCard label="Upcoming" value={upcoming} />
        <StatCard label="Past" value={past + undated} />
        <StatCard label="Current streak" value={`${streak} wk${streak === 1 ? '' : 's'}`} />
      </section>

      {/* Category breakdown */}
      <section>
        <h2 className="mb-1 text-[16px] font-bold text-[color:var(--color-ink)]">Category breakdown</h2>
        <p className="mb-4 text-[13px] text-[color:var(--color-ink-soft)]">Where your activities are concentrated.</p>
        <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          {categoryCounts.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-[12.5px] font-semibold text-[color:var(--color-ink)]">{c.name}</div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[color:var(--color-bg)]">
                <div
                  className="h-full rounded-full bg-[color:var(--color-ink)]"
                  style={{ width: `${(c.count / maxCategory) * 100}%` }}
                />
              </div>
              <div className="w-6 shrink-0 text-right text-[12.5px] font-bold text-[color:var(--color-ink-soft)]">
                {c.count}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trends over time */}
      <section>
        <h2 className="mb-1 text-[16px] font-bold text-[color:var(--color-ink)]">Trends over time</h2>
        <p className="mb-4 text-[13px] text-[color:var(--color-ink-soft)]">
          Activities added per week, last {WEEKS_SHOWN} weeks.
        </p>
        <div className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <div className="flex h-36 items-end gap-2.5">
            {weekly.map((w) => (
              <div key={w.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-28 w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-[color:var(--color-ink)] transition-all"
                    style={{ height: `${(w.count / maxWeekly) * 100}%`, minHeight: w.count > 0 ? 4 : 0 }}
                    title={`${w.count} added`}
                  />
                </div>
                <div className="text-[10px] font-semibold text-[color:var(--color-ink-soft)]">{w.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
      <div className="text-[22px] font-bold text-[color:var(--color-ink)]">{value}</div>
      <div className="mt-0.5 text-[12px] font-semibold text-[color:var(--color-ink-soft)]">{label}</div>
    </div>
  );
}

/**
 * Single-day calendar filter for Explore. Applies to both the Discover feed
 * and My activities (both are filtered with the same `matchesDate` helper —
 * see src/lib/date.ts). Items with no specific date (recurring, vague, or
 * unset) always show regardless of what's selected here, by design.
 */
export default function DateFilter({
  value,
  onChange,
}: {
  value: string; // "YYYY-MM-DD", or '' for no filter
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-2 text-[13px] font-semibold text-[color:var(--color-ink)]">
        <span className="sr-only">Filter by date</span>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-[13px] font-semibold text-[color:var(--color-ink)] outline-none"
        />
      </label>
      {value && (
        <button
          onClick={() => onChange('')}
          className="whitespace-nowrap rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-[12.5px] font-semibold text-[color:var(--color-ink-soft)]"
        >
          Clear
        </button>
      )}
    </div>
  );
}

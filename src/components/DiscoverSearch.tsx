import { useState } from 'react';

/**
 * Search box for the Discover panel (CalendarView.tsx) — sits above the
 * category chips per the "picture the UX first" prototype goal.
 *
 * This is NOT live-as-you-type filtering (that's what the category chips
 * already do). Hitting "Search" (or Enter) simulates going back out to
 * re-query Eventbrite/Dice/Resident Advisor/Partiful/NYC Parks: a brief
 * loading state, then results. Under the hood, since none of those sites
 * offers a public API this browser-based prototype can call (see
 * discoverEvents.ts), it's actually matching against the local curated
 * snapshot — but the interaction is built to feel like a real "go fetch
 * fresh results" search, which is the piece worth validating before any
 * real backend gets wired up in a later milestone.
 */
export default function DiscoverSearch({
  onSearch,
  onSearchingChange,
}: {
  /** Called once the simulated search "completes." '' means cleared/no active search. */
  onSearch: (query: string) => void;
  onSearchingChange: (searching: boolean) => void;
}) {
  const [draft, setDraft] = useState('');
  const [active, setActive] = useState('');

  const runSearch = (raw: string) => {
    const query = raw.trim();
    if (!query) {
      setActive('');
      onSearch('');
      onSearchingChange(false);
      return;
    }
    onSearchingChange(true);
    // Simulated round-trip to the four sources — see file doc comment above.
    window.setTimeout(() => {
      setActive(query);
      onSearch(query);
      onSearchingChange(false);
    }, 850);
  };

  const clear = () => {
    setDraft('');
    setActive('');
    onSearch('');
    onSearchingChange(false);
  };

  return (
    <div className="mb-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(draft);
        }}
        className="flex items-center gap-1.5"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search events, movies, and more…"
          className="min-w-0 flex-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-2 text-[12px] outline-none placeholder:text-[color:var(--color-ink-soft)] focus:border-[color:var(--color-brand-mid)]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[color:var(--color-brand)] px-3.5 py-2 text-[12px] font-bold text-[color:var(--color-on-brand)]"
        >
          Search
        </button>
      </form>
      {active && (
        <button
          onClick={clear}
          className="mt-1.5 text-[11px] font-semibold text-[color:var(--color-brand)]"
        >
          ✕ Clear search · "{active}"
        </button>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import type { DiscoverEvent } from '../types';
import type { ExploreFilters } from './FilterChips';
import { matchesDate } from '../lib/date';
import DiscoverCard from './DiscoverCard';

/**
 * A horizontally-scrolling, search/filter-aware Discover row. Not currently
 * used — Discover now lives as a compact vertical side panel inside
 * CalendarView.tsx (rendering DiscoverCard directly, unfiltered by
 * query/date since Calendar has no search bar of its own) so browsing and
 * scheduling happen in one place. Kept around as a working, reusable
 * component in case a searchable Discover surface is wanted again later.
 */
export default function DiscoverFeed({
  events,
  query,
  filters,
  selectedDate,
  addedLinks,
  onAdd,
}: {
  events: DiscoverEvent[];
  query: string;
  filters: ExploreFilters;
  selectedDate: string;
  addedLinks: Set<string>;
  onAdd: (event: DiscoverEvent) => void;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return events.filter((e) => {
      if (filters.categories.size > 0 && !filters.categories.has(e.category)) return false;

      if (!matchesDate(selectedDate, e.dateStart, e.dateEnd)) return false;

      if (q) {
        const haystack = [e.title, e.blurb, e.location].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [events, query, filters, selectedDate]);

  if (filtered.length === 0) {
    return (
      <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">
        Nothing in Discover matches those filters right now.
      </p>
    );
  }

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {filtered.map((e) => (
        <div key={e.id} className="w-[240px] shrink-0">
          <DiscoverCard event={e} added={addedLinks.has(e.link)} onAdd={() => onAdd(e)} />
        </div>
      ))}
    </div>
  );
}

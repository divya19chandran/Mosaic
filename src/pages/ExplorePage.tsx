import { useMemo, useState } from 'react';
import type { CategoryId } from '../types';
import { categoryById } from '../data/categories';
import { matchesDate } from '../lib/date';
import SearchBar from '../components/SearchBar';
import FilterChips, { type ExploreFilters } from '../components/FilterChips';
import DateFilter from '../components/DateFilter';
import ActivityList from '../components/ActivityList';
import ActivityDetailModal from '../components/ActivityDetailModal';
import AddActivityForm from '../components/AddActivityForm';
import CalendarView from './CalendarView';
import { useMyActivities } from '../hooks/useMyActivities';

const EMPTY_FILTERS: ExploreFilters = {
  categories: new Set(),
};

type ExploreView = 'list' | 'calendar';

/**
 * Calendar is the primary/default view — it's where ingestion (paste a
 * link, upload a screenshot, add manually, and browse Discover) now lives
 * too, see CalendarView.tsx. List is a secondary view for
 * searching/filtering everything you've already saved.
 */
export default function ExplorePage({ initialCategory }: { initialCategory?: CategoryId }) {
  const [view, setView] = useState<ExploreView>('calendar');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ExploreFilters>(() =>
    initialCategory ? { ...EMPTY_FILTERS, categories: new Set([initialCategory]) } : EMPTY_FILTERS
  );
  const [openActivityId, setOpenActivityId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const { activities, addActivity, removeActivity, updateActivity, findActivity } = useMyActivities();

  // Search runs across ALL categories at once — it is not scoped to whichever
  // category filter chips happen to be selected. Chips and search compose
  // together (both must match).
  const filteredActivities = useMemo(() => {
    const q = query.trim().toLowerCase();

    return activities.filter((a) => {
      if (filters.categories.size > 0 && !filters.categories.has(a.category)) return false;

      if (!matchesDate(selectedDate, a.dateStart, a.dateEnd)) return false;

      if (q) {
        const haystack = [a.title, a.notes, categoryById(a.category).name].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [query, filters, selectedDate, activities]);

  const openActivity = openActivityId ? findActivity(openActivityId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--color-brand)]">
            Explore
          </div>
          <h1 className="text-[26px] font-bold leading-tight text-[color:var(--color-ink)]">
            {view === 'calendar' ? "What you've actually got going on" : 'Your list of things to do'}
          </h1>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
            {view === 'calendar'
              ? 'Everything you\'ve saved, laid out by day and color-coded by category, with fresh ideas alongside to add straight onto a day.'
              : 'Search and filter everything you\'ve saved. Switch to Calendar to add something new.'}
          </p>
        </div>

        {/* List/Calendar toggle — Calendar is primary; List is a secondary
            search/filter view onto the same "my activities" data. */}
        <div className="inline-flex shrink-0 gap-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-1">
          <button
            onClick={() => setView('calendar')}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
              view === 'calendar' ? 'bg-[color:var(--color-brand)] text-[color:var(--color-on-brand)]' : 'text-[color:var(--color-ink-soft)]'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setView('list')}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
              view === 'list' ? 'bg-[color:var(--color-brand)] text-[color:var(--color-on-brand)]' : 'text-[color:var(--color-ink-soft)]'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <CalendarView
          activities={activities}
          addActivity={addActivity}
          removeActivity={removeActivity}
          updateActivity={updateActivity}
          findActivity={findActivity}
        />
      ) : (
        <>
          {showAddForm ? (
            <AddActivityForm
              onAdd={(input) => {
                addActivity(input);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="self-start rounded-full bg-[color:var(--color-brand)] px-4 py-2.5 text-[13.5px] font-bold text-[color:var(--color-on-brand)] shadow-sm"
            >
              + Add something
            </button>
          )}

          <div className="max-w-md">
            <SearchBar value={query} onChange={setQuery} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChips filters={filters} onChange={setFilters} />
            <DateFilter value={selectedDate} onChange={setSelectedDate} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold">My activities</span>
            <span className="text-[11.5px] text-[color:var(--color-ink-soft)]">
              {filteredActivities.length} result{filteredActivities.length === 1 ? '' : 's'}
            </span>
          </div>

          <ActivityList
            activities={filteredActivities}
            onOpen={setOpenActivityId}
            emptyMessage={
              activities.length === 0
                ? "You haven't added anything yet. Switch to Calendar to browse Discover, paste a link, or add something manually."
                : 'Nothing matches those filters yet. Try clearing a filter or searching something broader.'
            }
          />

          {openActivity && (
            <ActivityDetailModal
              activity={openActivity}
              onRemove={() => {
                removeActivity(openActivity.id);
                setOpenActivityId(null);
              }}
              onClose={() => setOpenActivityId(null)}
              onUpdate={(patch) => updateActivity(openActivity.id, patch)}
            />
          )}
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { categoryById } from '../data/categories';
import { buildMonthMatrix, expandDateRange, monthLabel } from '../lib/calendar';
import { formatDateLabel } from '../lib/date';
import { distanceMiles, formatDistance, type Coords } from '../lib/geo';
import { DISCOVER_EVENTS } from '../data/discoverEvents';
import type { Activity, DiscoverEvent } from '../types';
import type { NewActivityInput } from '../hooks/useMyActivities';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import ActivityDetailModal from '../components/ActivityDetailModal';
import AddActivityForm from '../components/AddActivityForm';
import DiscoverCard from '../components/DiscoverCard';
import DiscoverSearch from '../components/DiscoverSearch';
import FilterChips, { type ExploreFilters } from '../components/FilterChips';

/** "YYYY-MM-DD" -> the following day, same format. Used to build an exclusive upper bound for Google's timeMax. */
function nextDayIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const EMPTY_PANEL_FILTERS: ExploreFilters = { categories: new Set() };

type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

/**
 * Color-coded month calendar for everything in "my activities" — the
 * "data organization" piece of the Hobbies vision: seeing what's actually
 * committed on which day, spotting overlap/double-booking at a glance, and
 * telling at a glance which pillar of life a given day leans toward.
 *
 * This is now also where ingestion happens: a "+ Add" button for
 * paste-link/screenshot/manual entry, plus a Discover side panel of
 * not-yet-saved suggestions, sit right next to the grid — taking
 * inspiration from Rodeo's single-surface approach (browse, schedule, and
 * see your month all in one place) rather than splitting "find something"
 * and "see your month" across separate screens.
 *
 * Lives inside ExplorePage as the (now primary) "Calendar" half of its
 * List/Calendar toggle. Takes activity data/actions as props rather than
 * calling useMyActivities itself, so both halves of the toggle share one
 * source of truth instead of two independent localStorage reads.
 *
 * Multi-day activities (dateStart != dateEnd) are shown on every day in
 * their range rather than as a single spanning bar — a deliberate v1
 * simplification, not a limitation of the data model.
 */
export default function CalendarView({
  activities,
  addActivity,
  removeActivity,
  updateActivity,
  findActivity,
}: {
  activities: Activity[];
  addActivity: (input: NewActivityInput) => Activity;
  removeActivity: (id: string) => void;
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  findActivity: (id: string) => Activity | undefined;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [openActivityId, setOpenActivityId] = useState<string | null>(null);
  const [addFormDate, setAddFormDate] = useState<string | null>(null); // set to open AddActivityForm prefilled with this day
  const [quickAddOpen, setQuickAddOpen] = useState(false); // the top "+ Add" button — no day prefilled
  // Set when "Add" is clicked on a Discover card that has no resolvable
  // dateStart (e.g. "Multiple dates") — opens AddActivityForm prefilled
  // from the event, requiring a date before it can be saved, instead of
  // silently saving it undated into "Not yet scheduled".
  const [discoverPrefill, setDiscoverPrefill] = useState<DiscoverEvent | null>(null);
  // Clicking a day cell (not its "+" button, not one of its activity chips)
  // switches the side panel from "Discover ideas" to "what's on this day."
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Category filter for whichever the side panel is currently showing —
  // Discover ideas, or a selected day's activities.
  const [panelFilters, setPanelFilters] = useState<ExploreFilters>(EMPTY_PANEL_FILTERS);
  // "Sort by distance" on the Discover panel — one-shot browser geolocation
  // request, held in memory only (never persisted, never sent anywhere).
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  // Discover panel search — see DiscoverSearch.tsx. searchQuery is only set
  // once a simulated "fresh search" finishes; isSearching drives the
  // loading state shown in place of the results list while that runs.
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const weeks = useMemo(() => buildMonthMatrix(cursor.year, cursor.month), [cursor]);

  // Read-only Google Calendar overlay (see useGoogleCalendar.ts) — entirely
  // optional and off by default; nothing is fetched until the person clicks
  // "Connect Google Calendar" below, which is also where Google's own
  // consent screen asks permission for the calendar.readonly scope.
  const googleCalendar = useGoogleCalendar();
  const gridStartIso = weeks[0][0].iso;
  const gridEndIso = weeks[weeks.length - 1][6].iso;

  useEffect(() => {
    googleCalendar.refreshRange(gridStartIso, nextDayIso(gridEndIso));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridStartIso, gridEndIso, googleCalendar.status]);

  // Map "YYYY-MM-DD" -> activities occurring that day (expanding date ranges).
  const byDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      if (!a.dateStart) continue;
      for (const iso of expandDateRange(a.dateStart, a.dateEnd)) {
        const list = map.get(iso) ?? [];
        list.push(a);
        map.set(iso, list);
      }
    }
    return map;
  }, [activities]);

  const undated = useMemo(() => activities.filter((a) => !a.dateStart), [activities]);

  const addedLinks = useMemo(() => new Set(activities.map((a) => a.link).filter(Boolean) as string[]), [activities]);
  // Today, as "YYYY-MM-DD" — events with a concrete dateStart already in the
  // past are dropped from Discover entirely (this is what made the feed
  // feel stale: nothing here ever aged out on its own before). Events with
  // no dateStart (vague/recurring-without-a-pinned-date) still always show.
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const discoverIdeas = useMemo(
    () => DISCOVER_EVENTS.filter((e) => !addedLinks.has(e.link) && (!e.dateStart || e.dateStart >= todayIso)),
    [addedLinks, todayIso]
  );

  const visibleDiscoverIdeas = useMemo(() => {
    let filtered = discoverIdeas.filter(
      (e) => panelFilters.categories.size === 0 || panelFilters.categories.has(e.category)
    );
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((e) =>
        [e.title, e.blurb, e.location].filter(Boolean).join(' ').toLowerCase().includes(q)
      );
    }
    if (!userCoords) return filtered;
    // Known-distance cards first (nearest to farthest); cards with no
    // lat/lng (distance can't be known) keep their original relative order
    // at the end, rather than being hidden or sorted arbitrarily.
    const withDist = filtered
      .filter((e) => e.lat != null && e.lng != null)
      .sort(
        (a, b) =>
          distanceMiles(userCoords, { lat: a.lat!, lng: a.lng! }) -
          distanceMiles(userCoords, { lat: b.lat!, lng: b.lng! })
      );
    const withoutDist = filtered.filter((e) => e.lat == null || e.lng == null);
    return [...withDist, ...withoutDist];
  }, [discoverIdeas, panelFilters, userCoords, searchQuery]);

  const requestDistanceSort = () => {
    if (userCoords) {
      // Toggle off — back to default curated order.
      setUserCoords(null);
      setGeoStatus('idle');
      return;
    }
    if (!('geolocation' in navigator)) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('granted');
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { timeout: 10_000 }
    );
  };
  const selectedDayActivities = useMemo(
    () => (selectedDate ? (byDate.get(selectedDate) ?? []) : []),
    [selectedDate, byDate]
  );
  const visibleSelectedDayActivities = useMemo(
    () =>
      selectedDayActivities.filter(
        (a) => panelFilters.categories.size === 0 || panelFilters.categories.has(a.category)
      ),
    [selectedDayActivities, panelFilters]
  );

  const openActivity = openActivityId ? findActivity(openActivityId) : undefined;

  const goToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };
  const goPrev = () =>
    setCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  const goNext = () =>
    setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));

  const handleAddFromDiscover = (event: DiscoverEvent) => {
    if (!event.dateStart) {
      setDiscoverPrefill(event);
      return;
    }
    addActivity({
      title: event.title,
      category: event.category,
      link: event.link,
      date: event.date,
      dateStart: event.dateStart,
      dateEnd: event.dateEnd,
      location: event.location,
      notes: event.blurb,
      source: event.source,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Month nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[14px] font-bold text-[color:var(--color-ink)]"
          >
            ‹
          </button>
          <div className="min-w-[150px] text-center text-[15px] font-bold text-[color:var(--color-ink)]">
            {monthLabel(cursor.year, cursor.month)}
          </div>
          <button
            onClick={goNext}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[14px] font-bold text-[color:var(--color-ink)]"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="ml-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--color-ink-soft)]"
          >
            Today
          </button>
        </div>

        {/* Categories used to also be listed here as a static color legend,
            duplicating the same 5 names shown just below as filter chips in
            the side panel. Removed — the FilterChips row now carries a
            color dot per chip, so it serves as both the legend and the
            filter (one place for categories, not two). */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="rounded-full bg-[color:var(--color-brand)] px-4 py-2 text-[12.5px] font-bold text-[color:var(--color-on-brand)] shadow-sm"
        >
          + Add
        </button>
      </div>

      {/* Google Calendar overlay controls — off by default; nothing is
          fetched until this button is clicked, and that click is what
          triggers Google's own consent screen for the calendar.readonly
          scope. See useGoogleCalendar.ts. */}
      <div className="flex flex-wrap items-center gap-2">
        {googleCalendar.status === 'connected' ? (
          <div className="flex items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1.5 text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            Google Calendar connected
            <button
              onClick={googleCalendar.disconnect}
              className="font-bold text-[color:var(--color-brand-dark)] underline underline-offset-2"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => googleCalendar.connect(gridStartIso, nextDayIso(gridEndIso))}
            disabled={googleCalendar.status === 'connecting'}
            className="rounded-full border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1.5 text-[11.5px] font-semibold text-[color:var(--color-ink-soft)] disabled:opacity-60"
          >
            {googleCalendar.status === 'connecting' ? 'Connecting…' : '+ Connect Google Calendar (read-only)'}
          </button>
        )}
        {googleCalendar.status === 'error' && googleCalendar.errorMessage && (
          <span className="max-w-sm text-[11px] leading-snug text-[color:var(--color-ink-soft)]">
            {googleCalendar.errorMessage}
          </span>
        )}
      </div>

      {/* Grid + Discover side panel */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] lg:flex-1">
          <div className="grid grid-cols-7 border-b border-[color:var(--color-line)] bg-[color:var(--color-bg)]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weeks.flatMap((week, wi) =>
              week.map((day, di) => {
                const dayActivities = byDate.get(day.iso) ?? [];
                const dayGoogleEvents =
                  googleCalendar.status === 'connected' ? (googleCalendar.eventsByDate.get(day.iso) ?? []) : [];
                const visibleActivities = dayActivities.slice(0, 3);
                const visibleGoogleEvents = dayGoogleEvents.slice(0, Math.max(0, 3 - visibleActivities.length));
                const overflowCount =
                  dayActivities.length + dayGoogleEvents.length - visibleActivities.length - visibleGoogleEvents.length;
                const isLastCol = di === 6;
                const isLastRow = wi === weeks.length - 1;
                const isSelected = day.iso === selectedDate;
                return (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => setSelectedDate(day.iso)}
                    aria-pressed={isSelected}
                    aria-label={`View activities on ${day.iso}`}
                    className={`flex min-h-[92px] flex-col gap-1 p-1.5 text-left ${!isLastCol ? 'border-r' : ''} ${
                      !isLastRow ? 'border-b' : ''
                    } border-[color:var(--color-line)] transition-colors ${
                      isSelected
                        ? 'bg-[color:var(--color-brand-light)]'
                        : day.inCurrentMonth
                        ? 'bg-[color:var(--color-surface)] hover:bg-[color:var(--color-bg)]'
                        : 'bg-[color:var(--color-bg)]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                          day.isToday
                            ? 'bg-[color:var(--color-brand)] text-[color:var(--color-on-brand)]'
                            : day.inCurrentMonth
                            ? 'text-[color:var(--color-ink)]'
                            : 'text-[color:var(--color-ink-soft)]/50'
                        }`}
                      >
                        {day.dayOfMonth}
                      </span>
                      {day.inCurrentMonth && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddFormDate(day.iso);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              e.preventDefault();
                              setAddFormDate(day.iso);
                            }
                          }}
                          aria-label={`Add something on ${day.iso}`}
                          className="cursor-pointer text-[13px] font-bold text-[color:var(--color-line)] transition-colors hover:text-[color:var(--color-ink-soft)]"
                        >
                          +
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {visibleActivities.map((a) => {
                        const c = categoryById(a.category);
                        return (
                          <span
                            key={a.id}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActivityId(a.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                e.preventDefault();
                                setOpenActivityId(a.id);
                              }
                            }}
                            className="flex cursor-pointer items-center gap-1 truncate rounded-md px-1 py-0.5 text-left text-[10.5px] font-semibold text-white"
                            style={{ background: c.color }}
                            title={a.title}
                          >
                            <span className="truncate">{a.title}</span>
                          </span>
                        );
                      })}
                      {visibleGoogleEvents.map((ge) => (
                        <span
                          key={ge.id}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (ge.htmlLink) window.open(ge.htmlLink, '_blank', 'noopener,noreferrer');
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && ge.htmlLink) {
                              e.stopPropagation();
                              e.preventDefault();
                              window.open(ge.htmlLink, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="flex cursor-pointer items-center gap-1 truncate rounded-md border border-dashed border-[color:var(--color-ink-soft)] px-1 py-0.5 text-left text-[10.5px] font-semibold text-[color:var(--color-ink-soft)]"
                          title={`${ge.title}${ge.time ? ` · ${ge.time}` : ''} (Google Calendar)`}
                        >
                          <span className="truncate">{ge.title}</span>
                        </span>
                      ))}
                      {overflowCount > 0 && (
                        <span className="px-1 text-[10px] font-semibold text-[color:var(--color-ink-soft)]">
                          +{overflowCount} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Side panel — either "Discover" (not-yet-saved suggestions) or,
            once a day is clicked on the grid, that day's own activities.
            Both are filterable by hobby category with the same chips. */}
        <div className="w-full shrink-0 lg:w-72">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-[13px] font-bold">
              {selectedDate ? formatDateLabel(selectedDate) : 'Discover'}
            </span>
            {selectedDate ? (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[11px] font-semibold text-[color:var(--color-brand)]"
              >
                Back to Discover
              </button>
            ) : (
              <span className="text-[11px] text-[color:var(--color-ink-soft)]">Tap Add to save one</span>
            )}
          </div>

          {!selectedDate && (
            <DiscoverSearch onSearch={setSearchQuery} onSearchingChange={setIsSearching} />
          )}

          <div className="mb-3">
            <FilterChips filters={panelFilters} onChange={setPanelFilters} compact />
          </div>

          {!selectedDate && (
            <div className="mb-3 flex items-center gap-2">
              <button
                onClick={requestDistanceSort}
                disabled={geoStatus === 'loading'}
                className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                  userCoords
                    ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-[color:var(--color-on-brand)]'
                    : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'
                }`}
              >
                {geoStatus === 'loading'
                  ? 'Finding you…'
                  : userCoords
                  ? '✓ Sorted by distance'
                  : 'Sort by distance'}
              </button>
              {geoStatus === 'denied' && (
                <span className="text-[11px] text-[color:var(--color-ink-soft)]">
                  Location permission denied.
                </span>
              )}
              {geoStatus === 'error' && (
                <span className="text-[11px] text-[color:var(--color-ink-soft)]">
                  Couldn't get your location.
                </span>
              )}
            </div>
          )}

          {selectedDate ? (
            <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-0.5">
              <button
                onClick={() => setAddFormDate(selectedDate)}
                className="rounded-xl border border-dashed border-[color:var(--color-line)] px-3 py-2.5 text-[12.5px] font-bold text-[color:var(--color-ink-soft)] transition-colors hover:text-[color:var(--color-ink)]"
              >
                + Add something on this day
              </button>
              {visibleSelectedDayActivities.length === 0 ? (
                <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">
                  {selectedDayActivities.length === 0
                    ? "Nothing scheduled this day yet."
                    : 'Nothing this day matches that filter.'}
                </p>
              ) : (
                visibleSelectedDayActivities.map((a) => {
                  const c = categoryById(a.category);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setOpenActivityId(a.id)}
                      className="flex w-full items-start gap-2 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 text-left shadow-sm"
                    >
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold text-[color:var(--color-ink)]">
                          {a.title}
                        </span>
                        {(a.time || a.location) && (
                          <span className="mt-0.5 block truncate text-[11.5px] text-[color:var(--color-ink-soft)]">
                            {[a.time, a.location].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : isSearching ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span
                aria-hidden="true"
                className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--color-line)] border-t-[color:var(--color-brand)]"
              />
              <p className="text-[12px] text-[color:var(--color-ink-soft)]">
                Searching Eventbrite, Dice, Resident Advisor, Partiful & NYC Parks…
              </p>
            </div>
          ) : visibleDiscoverIdeas.length === 0 ? (
            <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">
              {searchQuery
                ? `Nothing matches "${searchQuery}" right now — try another search or clear it.`
                : discoverIdeas.length === 0
                ? "You've added everything in Discover right now."
                : 'Nothing in Discover matches that filter.'}
            </p>
          ) : (
            <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-0.5">
              {visibleDiscoverIdeas.map((e) => (
                <DiscoverCard
                  key={e.id}
                  event={e}
                  added={false}
                  onAdd={() => handleAddFromDiscover(e)}
                  distanceLabel={
                    userCoords && e.lat != null && e.lng != null
                      ? formatDistance(distanceMiles(userCoords, { lat: e.lat, lng: e.lng }))
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Undated activities — nothing should silently disappear just because it has no date yet */}
      {undated.length > 0 && (
        <div>
          <div className="mb-2 text-[13px] font-bold text-[color:var(--color-ink)]">Not yet scheduled</div>
          <div className="flex flex-wrap gap-2">
            {undated.map((a) => {
              const c = categoryById(a.category);
              return (
                <button
                  key={a.id}
                  onClick={() => setOpenActivityId(a.id)}
                  className="flex items-center gap-1.5 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1.5 text-[12.5px] font-semibold text-[color:var(--color-ink)]"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                  {a.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {addFormDate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16" onClick={() => setAddFormDate(null)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <AddActivityForm
              initialDate={addFormDate}
              onAdd={(input) => {
                addActivity(input);
                setAddFormDate(null);
              }}
              onCancel={() => setAddFormDate(null)}
            />
          </div>
        </div>
      )}

      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16" onClick={() => setQuickAddOpen(false)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <AddActivityForm
              onAdd={(input) => {
                addActivity(input);
                setQuickAddOpen(false);
              }}
              onCancel={() => setQuickAddOpen(false)}
            />
          </div>
        </div>
      )}

      {discoverPrefill && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16"
          onClick={() => setDiscoverPrefill(null)}
        >
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <AddActivityForm
              requireDate
              dateHint={`"${discoverPrefill.date ?? 'This event'}" doesn't map to one fixed day — pick the date you're actually going.`}
              initialValues={{
                title: discoverPrefill.title,
                category: discoverPrefill.category,
                link: discoverPrefill.link,
                location: discoverPrefill.location,
                notes: discoverPrefill.blurb,
                source: discoverPrefill.source,
              }}
              onAdd={(input) => {
                addActivity(input);
                setDiscoverPrefill(null);
              }}
              onCancel={() => setDiscoverPrefill(null)}
            />
          </div>
        </div>
      )}

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
    </div>
  );
}

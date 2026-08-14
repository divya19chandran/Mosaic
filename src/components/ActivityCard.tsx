import type { Activity } from '../types';
import { categoryById } from '../data/categories';
import CategoryTag from './CategoryTag';
import SourceBadge from './SourceBadge';

/** Small stroke-style location pin, matching the line-icon language already
 *  used elsewhere in the app (see SearchBar's magnifier icon). */
function PinIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0 text-[color:var(--color-ink-soft)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

/**
 * Wide schedule-row layout — a date/time block on the left, a landscape
 * thumbnail, title + category/location/source meta in the middle, and a
 * category-color indicator on the right. Inspired by studio class-schedule
 * listings (time, room photo, instructor/location, reserve button laid out
 * left to right) — reworked here without price/reserve since Hobbies
 * activities aren't bookings, just things a person is keeping track of.
 */
export default function ActivityCard({ activity, onOpen }: { activity: Activity; onOpen: (id: string) => void }) {
  const c = categoryById(activity.category);

  return (
    <button
      onClick={() => onOpen(activity.id)}
      className="flex w-full items-center gap-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 text-left shadow-sm transition-colors hover:border-[color:var(--color-ink-soft)] sm:gap-4"
    >
      {/* Date / time block */}
      <div className="w-14 shrink-0 sm:w-16">
        {activity.time ? (
          <div className="text-[12.5px] font-bold leading-snug text-[color:var(--color-ink)]">{activity.time}</div>
        ) : activity.date ? (
          <div className="text-[12.5px] font-bold leading-snug text-[color:var(--color-ink)]">{activity.date}</div>
        ) : (
          <div className="text-[11.5px] font-semibold leading-snug text-[color:var(--color-ink-soft)]">No date yet</div>
        )}
        {activity.time && activity.date && (
          <div className="mt-0.5 truncate text-[10.5px] text-[color:var(--color-ink-soft)]">{activity.date}</div>
        )}
      </div>

      {/* Thumbnail */}
      {activity.imageDataUrl ? (
        <img src={activity.imageDataUrl} alt="" className="h-16 w-24 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-light)] text-[17px] font-bold text-[color:var(--color-ink-soft)]">
          {c.name.charAt(0)}
        </div>
      )}

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-[color:var(--color-ink)]">{activity.title}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <CategoryTag category={activity.category} />
          {activity.location && (
            <span className="flex min-w-0 items-center gap-1 truncate text-[12px] text-[color:var(--color-ink-soft)]">
              <PinIcon />
              <span className="truncate">{activity.location}</span>
            </span>
          )}
          {activity.source && activity.source !== 'manual' && <SourceBadge source={activity.source} />}
        </div>
      </div>

      {/* Category indicator — no price/reserve here since these are saved
          activities, not bookings; the dot echoes the same color used for
          this category on the calendar and filter chips. */}
      <div className="flex shrink-0 flex-col items-end gap-1.5 pl-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} aria-hidden="true" />
        <span className="text-[11px] font-bold text-[color:var(--color-ink-soft)]">View</span>
      </div>
    </button>
  );
}

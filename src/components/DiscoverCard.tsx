import type { DiscoverEvent } from '../types';
import { categoryById } from '../data/categories';
import CategoryTag from './CategoryTag';
import SourceBadge from './SourceBadge';

export default function DiscoverCard({
  event,
  added,
  onAdd,
  distanceLabel,
}: {
  event: DiscoverEvent;
  added: boolean;
  onAdd: () => void;
  /** e.g. "1.2 mi away" — shown next to date/location when distance sort is active. */
  distanceLabel?: string;
}) {
  const c = categoryById(event.category);
  const needsDate = !event.dateStart;

  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <CategoryTag category={event.category} />
        <SourceBadge source={event.source} />
      </div>

      <div className="flex h-20 items-center justify-center rounded-xl bg-[color:var(--color-brand-light)] text-[20px] font-bold text-[color:var(--color-ink-soft)]">
        {c.name.charAt(0)}
      </div>

      <div className="min-w-0">
        <div className="text-[13.5px] font-bold leading-snug">{event.title}</div>
        {(event.date || event.location || distanceLabel) && (
          <div className="mt-0.5 truncate text-[11.5px] text-[color:var(--color-ink-soft)]">
            {[event.date, event.location].filter(Boolean).join(' · ')}
            {distanceLabel && (
              <span className="font-semibold text-[color:var(--color-brand)]">
                {(event.date || event.location) ? ' · ' : ''}
                {distanceLabel}
              </span>
            )}
          </div>
        )}
        {event.blurb && (
          <p className="mt-1.5 line-clamp-3 text-[12px] leading-snug text-[color:var(--color-ink-soft)]">
            {event.blurb}
          </p>
        )}
      </div>

      <div className="mt-auto flex gap-1.5 pt-1">
        <button
          onClick={onAdd}
          disabled={added}
          className={`flex-1 rounded-xl px-3 py-2 text-[12.5px] font-bold transition-colors ${
            added
              ? 'bg-[color:var(--color-line)] text-[color:var(--color-ink-soft)]'
              : 'bg-[color:var(--color-brand)] text-[color:var(--color-on-brand)]'
          }`}
        >
          {added ? 'Added ✓' : needsDate ? 'Add — pick a date' : 'Add to my list'}
        </button>
        <a
          href={event.link}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center rounded-xl border border-[color:var(--color-line)] px-3 py-2 text-[12.5px] font-bold text-[color:var(--color-ink)]"
          aria-label={`Open ${event.title} on ${event.source}`}
        >
          ↗
        </a>
      </div>
    </div>
  );
}

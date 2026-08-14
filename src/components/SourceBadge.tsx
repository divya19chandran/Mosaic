import type { SourceSite } from '../types';
import { sourceById } from '../data/sources';

/** Small "via ___" pill shown on Discover cards so it's clear where an event came from. */
export default function SourceBadge({ source, className = '' }: { source: SourceSite; className?: string }) {
  const s = sourceById(source);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2 py-0.5 text-[10.5px] font-semibold text-[color:var(--color-ink-soft)] ${className}`}
    >
      via {s.label}
    </span>
  );
}

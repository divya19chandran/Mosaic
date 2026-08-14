import { CATEGORIES } from '../data/categories';
import type { CategoryId } from '../types';

/**
 * Flat, monochrome replacement for the old color-coded donut chart. Each
 * category is just a card — name, one-line outcome, and a subtle arrow that
 * appears on hover — no per-category color or icon, in keeping with the
 * monochrome / Partiful-style visual language of the rest of the app.
 */
export default function CategoryGrid({ onSelectCategory }: { onSelectCategory: (id: CategoryId) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelectCategory(c.id)}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-left transition-colors hover:border-[color:var(--color-ink)]"
        >
          <div className="text-[15px] font-bold text-[color:var(--color-ink)]">{c.name}</div>
          <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-soft)]">{c.outcome}</p>
          <span className="mt-1 text-[12px] font-bold text-[color:var(--color-ink-soft)] transition-colors group-hover:text-[color:var(--color-ink)]">
            Explore →
          </span>
        </button>
      ))}
    </div>
  );
}

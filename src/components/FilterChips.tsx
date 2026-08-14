import { CATEGORIES } from '../data/categories';
import type { CategoryId } from '../types';

export interface ExploreFilters {
  categories: Set<CategoryId>; // empty set = all categories
}

function Chip({
  selected,
  onClick,
  compact,
  color,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
  /** Category accent color — rendered as a small dot so this chip row can
   *  double as the category color legend (previously shown separately, see
   *  CalendarView's now-removed Legend block). Omitted for the "All" chip. */
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 truncate rounded-full border text-center font-semibold transition-colors ${
        compact
          ? 'w-fit max-w-full justify-self-start px-2.5 py-1.5 text-[12px]'
          : 'whitespace-nowrap px-3.5 py-2 text-[13px]'
      } ${
        selected
          ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-[color:var(--color-on-brand)]'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'
      }`}
    >
      {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

export default function FilterChips({
  filters,
  onChange,
  compact,
}: {
  filters: ExploreFilters;
  onChange: (next: ExploreFilters) => void;
  /**
   * Tighter, evenly-gridded layout for narrow containers (e.g. the Calendar
   * side panel) where 6 flex-wrap chips of varying width ragged-wrap and
   * read as cluttered. Full-width surfaces (List view) keep the roomier
   * flex-wrap default.
   */
  compact?: boolean;
}) {
  const toggleCategory = (id: CategoryId) => {
    const next = new Set(filters.categories);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange({ ...filters, categories: next });
  };

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <Chip
          compact
          selected={filters.categories.size === 0}
          onClick={() => onChange({ ...filters, categories: new Set() })}
        >
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            compact
            color={c.color}
            selected={filters.categories.has(c.id)}
            onClick={() => toggleCategory(c.id)}
          >
            {c.name}
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Chip selected={filters.categories.size === 0} onClick={() => onChange({ ...filters, categories: new Set() })}>
        All categories
      </Chip>
      {CATEGORIES.map((c) => (
        <Chip key={c.id} color={c.color} selected={filters.categories.has(c.id)} onClick={() => toggleCategory(c.id)}>
          {c.name}
        </Chip>
      ))}
    </div>
  );
}

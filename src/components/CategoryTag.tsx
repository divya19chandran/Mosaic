import type { CategoryId } from '../types';
import { categoryById } from '../data/categories';

export default function CategoryTag({ category, className = '' }: { category: CategoryId; className?: string }) {
  const c = categoryById(category);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-ink)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--color-ink)] ${className}`}
    >
      {c.name}
    </span>
  );
}

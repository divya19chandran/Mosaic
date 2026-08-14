export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-soft)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search classes, walks, workshops, circles…"
        className="w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-3 pl-10 pr-9 text-[14px] outline-none placeholder:text-[color:#B4ADC4] focus:border-[color:var(--color-brand-mid)]"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[color:var(--color-ink-soft)]"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function ComingSoon({ label, blurb }: { label: string; blurb: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 py-20 text-center">
      <div className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--color-ink-soft)]">Coming soon</div>
      <div className="text-[19px] font-bold">{label}</div>
      <div className="text-[13px] leading-relaxed text-[color:var(--color-ink-soft)]">{blurb}</div>
    </div>
  );
}

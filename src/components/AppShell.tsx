import type { ReactNode } from 'react';
import { CATEGORIES } from '../data/categories';

const NAV_ITEMS = [
  { id: 'landing', label: 'Home', enabled: true },
  { id: 'explore', label: 'Explore', enabled: true },
  { id: 'insights', label: 'Insights', enabled: true },
  { id: 'profile', label: 'Profile', enabled: true },
] as const;

// Local dev URL for the portfolio site's blog post about building this app —
// only resolves while that project's dev server is also running locally.
const BLOG_URL = 'http://127.0.0.1:4300/blog/building-hobbies-ai-first.html';

// Same gradient family used on the hero/closing CTA buttons (LandingPage.tsx)
// — duplicated here rather than imported since AppShell is the more "base"
// component; keeps the two files decoupled at the cost of one small repeat.
const CTA_GRADIENT = {
  backgroundImage: 'linear-gradient(135deg, #7C8A6B 0%, #B99A63 55%, #B06A8F 100%)',
};

/**
 * Tiny 2×2 mosaic-tile mark, colored from the five life-area categories —
 * a literal "mosaic" next to the wordmark instead of a plain logotype.
 */
function MosaicMark() {
  const tiles = CATEGORIES.slice(0, 4);
  return (
    <span className="grid h-[18px] w-[18px] grid-cols-2 gap-[2px]" aria-hidden="true">
      {tiles.map((c) => (
        <span key={c.id} className="rounded-[2px]" style={{ backgroundColor: c.color }} />
      ))}
    </span>
  );
}

/**
 * Full-width webpage shell with a sticky top nav — replaces the earlier
 * phone-frame mockup chrome now that this is a real standalone web app.
 * Home, Explore, Insights, and Profile are all wired up. Connect (the
 * social/community layer) doesn't have a nav entry yet — it's still in
 * App.tsx as a reachable tab/ComingSoon screen, just not linked from here
 * until there's something real to show.
 *
 * No border or filled surface behind the bar — it sits directly on the
 * page's own black background with a light blur-on-scroll, so it reads as
 * "floating" over the hero rather than a boxed toolbar. The wordmark carries
 * a small 2×2 mosaic-tile mark (MosaicMark, below), and the bar ends in a
 * gradient "Get started" pill that jumps straight to Explore — both borrowed
 * from the original reference mockup's top nav.
 */
export default function AppShell({
  active,
  onNavigate,
  children,
}: {
  active: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[color:var(--color-bg)]">
      <header className="sticky top-0 z-40 bg-[color:var(--color-bg)]/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-10">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 text-[16px] font-extrabold tracking-tight text-[color:var(--color-ink)]"
          >
            <MosaicMark />
            Mosaic
          </button>

          <nav className="flex items-center gap-1 sm:gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === active;
              return (
                <button
                  key={item.id}
                  disabled={!item.enabled}
                  onClick={() => item.enabled && onNavigate(item.id)}
                  className={`relative rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors sm:px-4 ${
                    isActive
                      ? 'bg-[color:var(--color-brand)] text-[color:var(--color-on-brand)]'
                      : item.enabled
                      ? 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-brand-light)] hover:text-[color:var(--color-ink)]'
                      : 'cursor-default text-[color:var(--color-line)]'
                  }`}
                >
                  {item.label}
                  {!item.enabled && (
                    <span className="ml-1.5 rounded-full bg-[color:var(--color-bg)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
                      soon
                    </span>
                  )}
                </button>
              );
            })}
            <a
              href={BLOG_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[color:var(--color-ink-soft)] transition-colors hover:bg-[color:var(--color-brand-light)] hover:text-[color:var(--color-ink)] sm:px-4"
            >
              Blog
            </a>
          </nav>

          <button
            onClick={() => onNavigate('explore')}
            className="hidden rounded-full px-4 py-2 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(185,154,99,0.35)] sm:block"
            style={CTA_GRADIENT}
          >
            Get started
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-4 sm:px-10">{children}</main>
    </div>
  );
}

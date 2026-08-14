# Mosaic landing page — hero spacing, for ChatGPT review

Stack: React 19 + TypeScript + Vite + **Tailwind CSS v4** (arbitrary values like `w-[320px]`, `text-[13px]` are intentional, not typos — this codebase leans on Tailwind's bracket syntax a lot instead of the default scale).

The specific thing I want help with: the hero section's phone mockup + 3 "floating capture cards" (Pottery workshop / Breathwork session / Farmers market) around it. The cards are positioned with plain CSS `top`/`left` percentages (see `CAPTURE_CARDS` array), relative to a wrapper div sized to the phone's own width — not the full grid column. I'd like better-considered spacing/overlap/rotation between the phone and the three cards. Everything else on the page (feature strip, five life areas, about, closing CTA) can stay as-is unless the spacing changes there matter too.

## Design tokens (`src/index.css`)

```css
@import "tailwindcss";

@theme {
  --font-display: "Fraunces", serif;
  --color-gold-hover: #A48750;
  --color-gold: #B99A63;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;

  --color-brand: #FFFFFF;
  --color-brand-dark: #F5F3EF;
  --color-brand-light: #232320;
  --color-brand-mid: #8A8579;
  --color-on-brand: #0A0A0A;

  /* surfaces */
  --color-bg: #0A0A0A;
  --color-surface: #171613;
  --color-ink: #F5F3EF;
  --color-ink-soft: #A39C8C;
  --color-line: #2C2A25;
}

html, body, #root {
  height: 100%;
}

body {
  margin: 0;
  background: var(--color-bg);
  font-family: var(--font-sans);
  color: var(--color-ink);
}

* {
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}
```

Five category/pillar colors (from `src/data/categories.ts`, used elsewhere on the page): sage `#7C8A6B`, terracotta `#C97B63`, dusty blue `#6D829C`, gold `#B99A63`, dusty rose `#B06A8F`.

## Full page component (`src/pages/LandingPage.tsx`)

```tsx
import {
  Leaf,
  Palette,
  FlowerLotus,
  BookOpen,
  UsersThree,
  Sparkle,
  SquaresFour,
  CalendarBlank,
  ChartLineUp,
  type Icon,
} from '@phosphor-icons/react';
import { CATEGORIES } from '../data/categories';
import type { CategoryId } from '../types';

const BLOG_POST_URL = 'http://127.0.0.1:4300/blog/building-hobbies-ai-first.html';

const CATEGORY_ICONS: Record<CategoryId, Icon> = {
  healthy: Leaf,
  creative: Palette,
  peaceful: FlowerLotus,
  grow: BookOpen,
  connect: UsersThree,
};

const PRIMARY_BUTTON_CLASSES =
  'rounded-full py-3.5 text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(185,154,99,0.35)]';
const PRIMARY_BUTTON_GRADIENT = {
  backgroundImage: 'linear-gradient(135deg, #7C8A6B 0%, #B99A63 55%, #B06A8F 100%)',
};

const PEXELS = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

const PILLAR_PHOTOS: Record<CategoryId, string> = {
  healthy: PEXELS(2035099, 480, 640),
  creative: PEXELS(6611312, 480, 640),
  peaceful: PEXELS(4442117, 480, 640),
  grow: PEXELS(16960921, 480, 640),
  connect: PEXELS(31874011, 480, 640),
};

const CARD_INK = '#17150F';
const CARD_INK_SOFT = 'rgba(23,21,15,0.62)';

const CAPTURE_CARDS: Array<{
  photo: string;
  bg: string;
  source: string;
  title: string;
  meta: string;
  top: string;
  left: string;
  rotate: number;
}> = [
  {
    photo: PEXELS(4898084, 170, 220),
    bg: '#DCEAD9', // mint (sage tint)
    source: 'Saved from Instagram',
    title: 'Pottery workshop',
    meta: 'Apr 22 · 6:00 PM — Brooklyn, NY',
    top: '-6%',
    left: '-30%',
    rotate: -6,
  },
  {
    photo: PEXELS(6453915, 170, 220),
    bg: '#F6D9E1', // pink (dusty rose tint)
    source: 'Saved from Eventbrite',
    title: 'Breathwork session',
    meta: 'Apr 24 · 7:00 PM — Williamsburg, NY',
    top: '36%',
    left: '86%',
    rotate: 5,
  },
  {
    photo: PEXELS(31930012, 170, 220),
    bg: '#F3E1AC', // warm yellow (gold tint)
    source: 'Saved from Screenshot',
    title: 'Farmers market',
    meta: 'Apr 26 · 9:00 AM — Union Square',
    top: '82%',
    left: '-26%',
    rotate: -4,
  },
];

const FEATURES: Array<{ color: string; icon: Icon; title: string; blurb: string }> = [
  { color: '#7C8A6B', icon: Sparkle, title: 'Capture anything', blurb: 'Links, screenshots, and ideas — save in seconds.' },
  { color: '#B99A63', icon: SquaresFour, title: 'Organize by areas', blurb: 'Sort activities into what matters most to you.' },
  { color: '#6D829C', icon: CalendarBlank, title: 'Connect your calendar', blurb: 'See your plans come to life in one clear view.' },
  { color: '#B06A8F', icon: ChartLineUp, title: 'Get personal insights', blurb: 'Understand your patterns and make more intentional choices.' },
];

export default function LandingPage({
  onEnterExplore,
  onNavigate,
}: {
  onEnterExplore: (category?: CategoryId) => void;
  onNavigate: (tab: string) => void;
}) {
  return (
    <div className="flex flex-col gap-28 pb-8">
      {/* Hero */}
      <section className="relative grid gap-16 pt-6 sm:grid-cols-2 sm:items-center sm:pt-10">
        <GlowBackground />

        <div className="relative z-10">
          <h1 className="mb-5 font-display text-[36px] font-semibold leading-[1.12] tracking-tight text-[color:var(--color-ink)] sm:text-[50px]">
            One place to keep track of everything you want to do.
          </h1>
          <p className="mb-8 max-w-md text-[16px] leading-relaxed text-[color:var(--color-ink-soft)]">
            Save what catches your eye, see it on a calendar, and look back on how it went — one list for every
            hobby, instead of a different app for each one.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onEnterExplore()}
              className={`${PRIMARY_BUTTON_CLASSES} px-6`}
              style={PRIMARY_BUTTON_GRADIENT}
            >
              Explore activities →
            </button>
            <button
              onClick={() => onNavigate('profile')}
              className="rounded-full border border-[color:var(--color-line)] px-6 py-3.5 text-[14px] font-bold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-brand-light)]"
            >
              View your profile
            </button>
          </div>
        </div>

        <div className="relative z-10 flex justify-center sm:justify-end">
          {/* Sized exactly to PhoneMockup's own width (not the full grid
              column) so the cards' percentage-based top/left below are
              computed against the phone itself, not the wider column it
              sits in. */}
          <div className="relative w-[320px] sm:w-[360px]">
            <PhoneMockup />
            {CAPTURE_CARDS.map((c) => (
              <FloatingCard key={c.title} {...c} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section>
        <h2 className="mb-8 text-center font-display text-[26px] font-semibold text-[color:var(--color-ink)]">
          Everything in one place
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col items-start gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${f.color}26` }}
                aria-hidden="true"
              >
                <f.icon size={20} weight="bold" color={f.color} />
              </span>
              <h3 className="text-[15px] font-bold text-[color:var(--color-ink)]">{f.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-[color:var(--color-ink-soft)]">{f.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Five life areas */}
      <section className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="mb-3 font-display text-[26px] font-semibold text-[color:var(--color-ink)]">
            The five life areas
          </h2>
          <p className="mb-5 max-w-xs text-[14px] leading-relaxed text-[color:var(--color-ink-soft)]">
            Focus on what matters. Mosaic helps you cultivate balance across the areas that shape a richer life.
          </p>
          <button
            onClick={() => onEnterExplore()}
            className="text-[13.5px] font-bold text-[color:var(--color-ink)] underline underline-offset-2"
          >
            Explore the areas →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => {
            const CategoryIcon = CATEGORY_ICONS[c.id];
            return (
              <button
                key={c.id}
                onClick={() => onEnterExplore(c.id)}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl text-left"
              >
                <img
                  src={PILLAR_PHOTOS[c.id]}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, rgba(10,10,10,0) 40%, rgba(10,10,10,0.88) 100%)' }}
                  aria-hidden="true"
                />
                <span
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur"
                  style={{ backgroundColor: `${c.color}55` }}
                  aria-hidden="true"
                >
                  <CategoryIcon size={16} weight="bold" color="#FFFFFF" />
                </span>
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3.5">
                  <span className="text-[14px] font-bold text-white">{c.name}</span>
                  <span className="text-[11.5px] leading-snug text-white/75">{c.outcome}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="mb-4 font-display text-[26px] font-semibold text-[color:var(--color-ink)]">About</h2>
        <div className="max-w-2xl space-y-4 text-[14px] leading-relaxed text-[color:var(--color-ink-soft)]">
          <p className="text-[17px] font-semibold text-[color:var(--color-ink)]">
            Mosaic is a personal companion for intentionally building a richer life.
          </p>
          <p>
            The idea was inspired by my own experience after moving to New York City. Surrounded by endless
            opportunities to learn, create, volunteer, and meet new people, I realized the hardest part wasn't
            discovering activities — it was deciding which ones were worth my time and understanding how those
            experiences were shaping my life over time.
          </p>
          <p>
            I built Mosaic to explore that problem. The app helps users capture activities from links and
            screenshots, organize them into meaningful life areas, connect them to their calendar, and generate
            insights that help them make more intentional decisions about how they spend their time.
          </p>
          <a
            href={BLOG_POST_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block font-bold text-[color:var(--color-ink)] underline underline-offset-2"
          >
            Read the full product story →
          </a>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="flex flex-col items-center gap-5 rounded-3xl border border-[color:var(--color-line)] px-6 py-14 text-center">
        <h2 className="max-w-md font-display text-[26px] font-semibold text-[color:var(--color-ink)]">
          Ready to build a richer, more intentional life?
        </h2>
        <button
          onClick={() => onEnterExplore()}
          className={`${PRIMARY_BUTTON_CLASSES} px-7`}
          style={PRIMARY_BUTTON_GRADIENT}
        >
          Start exploring →
        </button>
      </section>
    </div>
  );
}

function GlowBackground() {
  const blobs = [
    { color: '#7C8A6B', top: '-12%', left: '34%', size: 380 },
    { color: '#C97B63', top: '4%', left: '70%', size: 340 },
    { color: '#6D829C', top: '38%', left: '8%', size: 320 },
    { color: '#B99A63', top: '48%', left: '58%', size: 360 },
    { color: '#B06A8F', top: '68%', left: '30%', size: 300 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            backgroundColor: b.color,
            opacity: 0.1,
          }}
        />
      ))}
    </div>
  );
}

function PhoneMockup() {
  const upcoming = [
    { day: 'THU', date: '15', title: 'Ceramics Class', time: '7:00 – 8:30 PM', place: 'Brooklyn Clay' },
    { day: 'SAT', date: '17', title: 'Sunrise Hike', time: '6:30 – 9:00 AM', place: 'Prospect Park' },
    { day: 'SUN', date: '18', title: 'Volunteering', time: '10:00 AM – 1:00 PM', place: 'Brooklyn Food Bank' },
  ];

  return (
    <div className="w-[320px] rounded-[40px] border border-[color:var(--color-line)] bg-black p-2.5 shadow-[0_30px_60px_rgba(0,0,0,0.55)] sm:w-[360px]">
      <div className="rounded-[32px] bg-[color:var(--color-surface)] p-4">
        <div className="mx-auto mb-4 h-5 w-24 rounded-full bg-black" aria-hidden="true" />

        <p className="text-[13px] font-bold text-[color:var(--color-ink)]">Good morning, Divya</p>
        <p className="mb-4 text-[11px] text-[color:var(--color-ink-soft)]">Let's build a meaningful day.</p>

        <div className="mb-4 flex gap-1.5">
          {['This week', 'Areas', 'Calendar'].map((t, i) => (
            <span
              key={t}
              className={`rounded-full px-2.5 py-1 text-[9.5px] font-semibold ${
                i === 0
                  ? 'bg-[color:var(--color-brand)] text-[color:var(--color-on-brand)]'
                  : 'bg-[color:var(--color-brand-light)] text-[color:var(--color-ink-soft)]'
              }`}
            >
              {t}
            </span>
          ))}
        </div>

        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
          Upcoming
        </p>
        <div className="mb-3 flex flex-col gap-2">
          {upcoming.map((u) => (
            <div key={u.title} className="flex items-center gap-2 rounded-xl bg-[color:var(--color-brand-light)] p-2">
              <div className="flex w-8 flex-col items-center leading-none">
                <span className="text-[8px] font-bold text-[color:var(--color-ink-soft)]">{u.day}</span>
                <span className="text-[13px] font-bold text-[color:var(--color-ink)]">{u.date}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-[color:var(--color-ink)]">{u.title}</p>
                <p className="truncate text-[9.5px] text-[color:var(--color-ink-soft)]">
                  {u.time} · {u.place}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mb-3 text-[10.5px] font-bold text-[color:var(--color-ink)] underline underline-offset-2">
          View full calendar →
        </p>

        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
          This week at a glance
        </p>
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {[
            { n: '3', l: 'Activities' },
            { n: '2', l: 'With friends' },
            { n: '1', l: 'New experience' },
          ].map((s) => (
            <div key={s.l} className="rounded-lg bg-[color:var(--color-brand-light)] p-1.5 text-center">
              <p className="text-[13px] font-bold text-[color:var(--color-ink)]">{s.n}</p>
              <p className="text-[7.5px] leading-tight text-[color:var(--color-ink-soft)]">{s.l}</p>
            </div>
          ))}
        </div>

        <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
          Time across your areas
        </p>
        <div className="flex h-2 overflow-hidden rounded-full">
          {CATEGORIES.map((c) => (
            <span key={c.id} className="h-full flex-1" style={{ backgroundColor: c.color }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatingCard({
  photo,
  bg,
  source,
  title,
  meta,
  top,
  left,
  rotate,
}: {
  photo: string;
  bg: string;
  source: string;
  title: string;
  meta: string;
  top: string;
  left: string;
  rotate: number;
}) {
  return (
    <div
      className="absolute hidden w-[220px] sm:block"
      style={{ top, left, transform: `rotate(${rotate}deg)` }}
    >
      <div
        className="flex overflow-hidden rounded-2xl shadow-[0_14px_28px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: bg }}
      >
        <img src={photo} alt="" aria-hidden="true" className="w-[84px] flex-shrink-0 self-stretch object-cover" />
        <div className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-3">
          <p className="truncate text-[9px] font-semibold" style={{ color: CARD_INK_SOFT }}>
            {source}
          </p>
          <p className="truncate text-[13px] font-bold" style={{ color: CARD_INK }}>
            {title}
          </p>
          <p className="truncate text-[9.5px]" style={{ color: CARD_INK_SOFT }}>
            {meta}
          </p>
        </div>
      </div>
    </div>
  );
}
```

## What I'd ask ChatGPT

Something like: *"Given this component and design tokens, can you suggest better `top`/`left`/`rotate` values (and possibly card width/padding) for the three `CAPTURE_CARDS` so they feel intentionally composed around the phone mockup — good breathing room, no crowding, no overlap with the phone's own text content (greeting, tab pills, upcoming list, 'View full calendar' link, stats grid, category bar), and no overlap with the sticky nav above the hero. The wrapping div is sized exactly to the phone's own width (`w-[320px] sm:w-[360px]`), so `top`/`left` percentages on the cards are relative to that box, not the full page."*

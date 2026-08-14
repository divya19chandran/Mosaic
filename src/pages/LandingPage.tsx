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
  Sun,
  WifiHigh,
  CellSignalFull,
  BatteryFull,
  type Icon,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { CATEGORIES } from '../data/categories';
import type { CategoryId } from '../types';
import { DesignModeProvider, EditableText, Positionable, PositionCanvas, useDesignModeEnabled } from '../dev/DesignMode';
import heroPositions from '../data/hero-positions.json';
import heroCopy from '../data/hero-copy.json';

// hero-copy.json's keys are a flat id → string map, including dotted keys
// like "pottery.title" for the floating cards — cast once here so the
// dynamic `${id}.field` lookups below don't need per-call casts.
const HERO_COPY = heroCopy as Record<string, string>;

const BLOG_POST_URL = 'http://127.0.0.1:4300/blog/building-hobbies-ai-first.html';

/**
 * Phosphor Icons (phosphoricons.com) — replaces the plain colored dots/no
 * icons used in the first pass, per explicit feedback: friendlier and closer
 * to the Apple/Airbnb reference aesthetic than Heroicons.
 */
const CATEGORY_ICONS: Record<CategoryId, Icon> = {
  healthy: Leaf,
  creative: Palette,
  peaceful: FlowerLotus,
  grow: BookOpen,
  connect: UsersThree,
};

/** Shared pill button style: subtle multi-stop gradient across the pillar
 * palette (sage → gold → dusty rose), white text for contrast, and a
 * hover lift + soft glow. Replaces the flat white fill from the first pass
 * per the "subtle gradient fills… hover lift+glow" button guidance. */
const PRIMARY_BUTTON_CLASSES =
  'rounded-full py-3.5 text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(185,154,99,0.35)]';
const PRIMARY_BUTTON_GRADIENT = {
  backgroundImage: 'linear-gradient(135deg, #7C8A6B 0%, #B99A63 55%, #B06A8F 100%)',
};

/**
 * Photography for the hero's phone/floating cards and the five pillar cards
 * below. Hotlinked directly from Pexels' CDN (images.pexels.com/photos/{id}/
 * pexels-photo-{id}.jpeg — Pexels' standard direct-image URL pattern, with
 * their documented resize params for crop/w/h) rather than search-result
 * pages, so no visit to pexels.com itself is required to render these.
 *
 * IMPORTANT CAVEAT: these specific photo IDs were chosen from Pexels' own
 * search titles/descriptions (via web search), not by visually inspecting
 * the photos — pexels.com and images.pexels.com are both blocked for the
 * fetch tools available here, so there was no way to render or preview them
 * before wiring them in. Preview the live app and swap any IDs that don't
 * quite match the mood once you see them. Better yet — replace this whole
 * object with real photos of your own (Met visit, your pottery class,
 * Prospect Park, Domino Park, your yoga studio, a volunteering day, the
 * café), which was the stronger direction anyway per your own note that it
 * makes the product feel authentic rather than templated.
 */
const PEXELS = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

const PILLAR_PHOTOS: Record<CategoryId, string> = {
  healthy: PEXELS(2035099, 480, 640), // outdoor yoga stretch in dappled sunlight
  creative: PEXELS(6611312, 480, 640), // potter's hands shaping a vase on the wheel
  peaceful: PEXELS(4442117, 480, 640), // reading with coffee at an outdoor café
  grow: PEXELS(16960921, 480, 640), // looking at paintings in a museum, back view
  connect: PEXELS(31874011, 480, 640), // community gathering in a park
};

/** Small square thumbnails for the phone mockup's "Upcoming" list rows —
 * matches the reference mock's photo-forward list items instead of the
 * plain day/date-only rows used before. */
const UPCOMING_PHOTOS = {
  ceramics: PEXELS(6611312, 120, 120), // potter's hands on the wheel
  hike: PEXELS(2035099, 120, 120), // outdoor stretch / trail light
  volunteering: PEXELS(31874011, 120, 120), // community gathering
};

/**
 * Light pastel tints of the five-pillar palette (sage → mint, dusty rose →
 * pink, gold → warm yellow), used only for these three capture cards. This
 * is the one deliberate break from the site's otherwise all-dark theme —
 * matching the reference mock's white-card-on-dark-hero look exactly, per
 * explicit request. Dark ink colors below are paired with it since the
 * site's own --color-ink tokens are built for light-on-dark, not dark-on-
 * light.
 */
const CARD_INK = '#17150F';
const CARD_INK_SOFT = 'rgba(23,21,15,0.62)';

/**
 * Fallback top/left/width/rotate — only used if a card's `id` is missing
 * from src/data/hero-positions.json. That file is the live source of truth
 * once Design Mode has been used (see src/dev/DesignMode.tsx): dragging a
 * card in the browser saves its new position there, so these inline values
 * exist purely as a sane starting point / safety net, not the values
 * actually rendered day to day.
 */
const CAPTURE_CARDS: Array<{
  id: keyof typeof heroPositions;
  photo: string;
  bg: string;
  source: string;
  title: string;
  meta: string;
  top: string;
  left: string;
  rotate: number;
  width: number;
}> = [
  {
    // Left side, vertically centered on the "Upcoming" list — mirrors the
    // reference mock's single card floating beside (not over) the phone's
    // left edge, with only a hairline safety margin so no phone text is
    // ever covered.
    id: 'pottery',
    photo: PEXELS(4898084, 170, 220), // artisan hands shaping clay pottery
    bg: '#DCEAD9', // mint (sage tint)
    source: 'Saved from Instagram',
    title: 'Pottery workshop',
    meta: 'Apr 22 · 6:00 PM — Brooklyn, NY',
    top: '42%',
    left: '-61%',
    rotate: -4,
    width: 220,
  },
  {
    // Right side, upper — stacked in a column with the Farmers market card
    // below it, per the reference mock (both "saved" cards float to the
    // right of the phone rather than split left/right).
    id: 'breathwork',
    photo: PEXELS(6453915, 170, 220), // peaceful meditation in sunny morning light
    bg: '#F6D9E1', // pink (dusty rose tint)
    source: 'Saved from Eventbrite',
    title: 'Breathwork session',
    meta: 'Apr 24 · 7:00 PM — Williamsburg, NY',
    top: '17%',
    left: '106%',
    rotate: 4,
    width: 236,
  },
  {
    // Right side, lower — same left anchor as the Breathwork card above it,
    // aligned with the stats/pillars-bar area near the bottom of the phone.
    id: 'farmersMarket',
    photo: PEXELS(31930012, 170, 220), // vibrant farmers market produce display
    bg: '#F3E1AC', // warm yellow (gold tint)
    source: 'Saved from Screenshot',
    title: 'Farmers market',
    meta: 'Apr 26 · 9:00 AM — Union Square',
    top: '80%',
    left: '106%',
    rotate: -3,
    width: 212,
  },
];

const FEATURES: Array<{ color: string; icon: Icon; title: string; blurb: string }> = [
  {
    color: '#7C8A6B',
    icon: Sparkle,
    title: 'Capture anything',
    blurb: 'Links, screenshots, and ideas — save in seconds.',
  },
  {
    color: '#B99A63',
    icon: SquaresFour,
    title: 'Organize by areas',
    blurb: 'Sort activities into what matters most to you.',
  },
  {
    color: '#6D829C',
    icon: CalendarBlank,
    title: 'Connect your calendar',
    blurb: 'See your plans come to life in one clear view.',
  },
  {
    color: '#B06A8F',
    icon: ChartLineUp,
    title: 'Get personal insights',
    blurb: 'Understand your patterns and make more intentional choices.',
  },
];

/**
 * Landing / home page. This is the front door of the app, not a roadmap or
 * pitch deck — no "milestone" framing, no phased rollout language, and no
 * cards that just restate what the nav tabs already say.
 *
 * Visual direction: premium/editorial dark theme (Apple, Airbnb, Arc, Linear
 * as reference points) — real photography instead of the hand-drawn doodle
 * style used in an earlier pass, warm blurred gradient glows instead of flat
 * color blocks, and a floating hero (phone mockup + drifting "capture" cards)
 * instead of a boxed-in graphic. No fake social proof ("join thousands of
 * users") since this is a personal, single-user app right now — the hero's
 * proof point is the product itself, not a user count.
 */
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
      <section className="relative grid min-h-[620px] gap-12 pt-10 sm:grid-cols-2 sm:items-center lg:gap-20">
        <GlowBackground />

        {/* DesignModeProvider wraps both hero columns (not just the phone
            box) so the same "Design mode" toggle covers both tools: dragging
            the phone/cards (Positionable, scoped to the PositionCanvas below)
            and click-to-edit text anywhere in the hero (EditableText, which
            only needs this outer provider — see src/dev/DesignMode.tsx for
            why those two are split). It renders no wrapper div of its own, so
            the sm:grid-cols-2 layout below is unaffected. Dev-only; no-ops in
            production. */}
        <DesignModeProvider>
          <div className="relative z-10">
            <EditableText
              id="headline"
              as="h1"
              defaultValue={heroCopy.headline}
              className="mb-5 font-display text-[36px] font-semibold leading-[1.12] tracking-tight text-[color:var(--color-ink)] sm:text-[50px]"
            />
            <EditableText
              id="subhead"
              as="p"
              defaultValue={heroCopy.subhead}
              className="mb-8 max-w-md text-[16px] leading-relaxed text-[color:var(--color-ink-soft)]"
            />
            <div className="flex flex-wrap gap-3">
              <HeroCtaButton
                textId="ctaPrimary"
                defaultValue={heroCopy.ctaPrimary}
                onActivate={() => onEnterExplore()}
                className={`${PRIMARY_BUTTON_CLASSES} px-6`}
                style={PRIMARY_BUTTON_GRADIENT}
              />
              <HeroCtaButton
                textId="ctaSecondary"
                defaultValue={heroCopy.ctaSecondary}
                onActivate={() => onNavigate('profile')}
                className="rounded-full border border-[color:var(--color-line)] px-6 py-3.5 text-[14px] font-bold text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-brand-light)]"
              />
            </div>
          </div>

          <div className="relative z-10 flex justify-center sm:justify-center lg:-translate-x-4">
            {/* Sized exactly to PhoneMockup's own width (not the full grid
                column) so the cards' percentage-based top/left below are
                computed against the phone itself, not the wider column it
                sits in — otherwise "68% left" lands in the middle of the
                phone instead of beside it. The phone is now itself absolutely
                positioned (wrapped in Positionable below, marked `isAnchor`),
                which means nothing is left in normal document flow to give
                this box a height — `isAnchor` makes it report its own live
                rendered height back up to PositionCanvas, which uses that as
                this container's height instead of a hand-guessed min-height
                (a guess drifts out of sync with actual content and leaves
                stray blank space below the hero). PositionCanvas owns this
                box (see src/dev/DesignMode.tsx) so the floating "Design mode"
                button can drag/resize/rotate the phone and cards below
                directly on the live page — click it, drag anything, and it
                saves straight to src/data/hero-positions.json. Dev-only;
                no-ops in production. */}
            <PositionCanvas className="w-[340px] sm:w-[400px]">
              <Positionable
                id="phone"
                isAnchor
                defaultTop={heroPositions.phone?.top ?? '0%'}
                defaultLeft={heroPositions.phone?.left ?? '0%'}
                defaultWidth={heroPositions.phone?.width ?? 400}
                defaultRotate={heroPositions.phone?.rotate ?? 0}
              >
                <PhoneMockup />
              </Positionable>
              {CAPTURE_CARDS.map((c) => (
                <Positionable
                  key={c.id}
                  id={c.id}
                  defaultTop={heroPositions[c.id]?.top ?? c.top}
                  defaultLeft={heroPositions[c.id]?.left ?? c.left}
                  defaultWidth={heroPositions[c.id]?.width ?? c.width}
                  defaultRotate={heroPositions[c.id]?.rotate ?? c.rotate}
                >
                  <FloatingCard {...c} />
                </Positionable>
              ))}
            </PositionCanvas>
          </div>
        </DesignModeProvider>
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
            opportunities to learn, create, volunteer, and meet new people, I realized the challenge wasn't
            discovering activities but deciding which ones were worth my time and understanding how those
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

/**
 * Large, very soft blurred radial glows behind the hero's phone mockup — one
 * per pillar color (sage, terracotta/peach, dusty blue, gold, dusty rose),
 * echoing the five-pillar palette without reading as flat color blocks.
 * Kept subtle (low opacity, heavy blur) per the "very subtle radial
 * gradients behind the phone" feedback — this isn't meant to be a visible
 * gradient background, just a faint warmth behind the glass.
 */
function GlowBackground() {
  const blobs = [
    { color: '#7C8A6B', top: '-12%', left: '34%', size: 380 }, // sage
    { color: '#C97B63', top: '4%', left: '70%', size: 340 }, // terracotta / peach
    { color: '#6D829C', top: '38%', left: '8%', size: 320 }, // dusty blue
    { color: '#B99A63', top: '48%', left: '58%', size: 360 }, // muted gold
    { color: '#B06A8F', top: '68%', left: '30%', size: 300 }, // dusty rose
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

/**
 * Hero CTA button whose label is click-to-editable via `<EditableText>`.
 * While design mode is on, the button's normal navigation is suppressed
 * (`onActivate` isn't wired to onClick) — otherwise clicking into the label
 * to place a cursor would also fire the button's click handler and navigate
 * away mid-edit. Must render under a `<DesignModeProvider>`.
 */
function HeroCtaButton({
  textId,
  defaultValue,
  onActivate,
  className,
  style,
}: {
  textId: string;
  defaultValue: string;
  onActivate: () => void;
  className: string;
  style?: CSSProperties;
}) {
  const designModeEnabled = useDesignModeEnabled();
  return (
    <button
      type="button"
      onClick={designModeEnabled ? undefined : onActivate}
      className={className}
      style={style}
    >
      <EditableText id={textId} as="span" defaultValue={defaultValue} />
    </button>
  );
}

/**
 * Static, illustrative preview of the app inside a simplified iPhone frame —
 * marketing-mock content (not live user data), the same technique used in
 * the reference mock this hero is based on. No drift/bob animation — held
 * still per explicit feedback that the floating motion didn't land well.
 */
function PhoneMockup() {
  const upcoming = [
    {
      day: 'THU',
      date: '15',
      title: 'Ceramics Class',
      time: '7:00 – 8:30 PM',
      place: 'Brooklyn Clay',
      photo: UPCOMING_PHOTOS.ceramics,
    },
    {
      day: 'SAT',
      date: '17',
      title: 'Sunrise Hike',
      time: '6:30 – 9:00 AM',
      place: 'Prospect Park',
      photo: UPCOMING_PHOTOS.hike,
    },
    {
      day: 'SUN',
      date: '18',
      title: 'Volunteering',
      time: '10:00 AM – 1:00 PM',
      place: 'Brooklyn Food Bank',
      photo: UPCOMING_PHOTOS.volunteering,
    },
  ];

  return (
    <div className="w-[340px] rounded-[40px] border border-[color:var(--color-line)] bg-black p-2.5 shadow-[0_30px_60px_rgba(0,0,0,0.55)] sm:w-[400px]">
      <div className="rounded-[32px] bg-[color:var(--color-surface)] p-4">
        {/* Status bar — time left, Dynamic-Island-style pill centered, signal
            icons right, matching the reference mock's iOS-chrome framing. */}
        <div className="relative mb-4 flex items-center justify-between">
          <span className="text-[11px] font-bold text-[color:var(--color-ink)]">9:41</span>
          <div className="absolute left-1/2 top-0 h-5 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
          <div className="flex items-center gap-1 text-[color:var(--color-ink)]">
            <CellSignalFull size={12} weight="fill" />
            <WifiHigh size={12} weight="fill" />
            <BatteryFull size={14} weight="fill" />
          </div>
        </div>

        <div className="mb-4 flex items-center gap-1.5">
          <Sun size={15} weight="fill" color="#B99A63" />
          <div>
            <EditableText
              id="phoneGreeting"
              as="p"
              defaultValue={heroCopy.phoneGreeting}
              className="text-[13px] font-bold text-[color:var(--color-ink)]"
            />
            <EditableText
              id="phoneGreetingSub"
              as="p"
              defaultValue={heroCopy.phoneGreetingSub}
              className="text-[11px] text-[color:var(--color-ink-soft)]"
            />
          </div>
        </div>

        <div className="mb-4 flex gap-1.5">
          {['This week', 'Pillars', 'Calendar'].map((t, i) => (
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
              <img src={u.photo} alt="" aria-hidden="true" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" />
              <div className="flex w-7 flex-shrink-0 flex-col items-center leading-none">
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
          Time across your pillars
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

/**
 * One "activity just got captured" card face. Matches the reference mock:
 * a tall photo bleeding edge-to-edge on the left (no padding around it,
 * clipped to the card's own rounded corners) against a light pastel card
 * face, rather than a small padded thumbnail on the site's dark surface
 * color. Held still (no drift/bob) per explicit feedback — the only motion
 * is the static rotate() applied by the positioning wrapper.
 *
 * Purely visual — positioning (top/left/width/rotate) lives one level up in
 * `<Positionable>` (src/dev/DesignMode.tsx), which is what makes this card
 * draggable/resizable in Design Mode without FloatingCard needing to know
 * anything about that.
 */
function FloatingCard({
  id,
  photo,
  bg,
  source,
  title,
  meta,
}: {
  id: string;
  photo: string;
  bg: string;
  source: string;
  title: string;
  meta: string;
}) {
  return (
    // Fixed intrinsic width (not w-full/h-full off an ancestor) — Positionable
    // measures this natural size and resizes by scaling the whole card
    // uniformly, so the image and text always stay in proportion instead of
    // reflowing at arbitrary pixel widths. See src/dev/DesignMode.tsx.
    <div
      className="flex w-[220px] overflow-hidden rounded-[18px] border border-black/5 shadow-[0_16px_40px_rgba(0,0,0,0.32)]"
      style={{ backgroundColor: bg }}
    >
      <img src={photo} alt="" aria-hidden="true" className="w-[76px] flex-shrink-0 self-stretch object-cover" />
      <div className="flex min-w-0 flex-col justify-center gap-1 px-3 py-3">
        <EditableText
          id={`${id}.source`}
          as="p"
          defaultValue={HERO_COPY[`${id}.source`] ?? source}
          className="truncate text-[8.5px] font-semibold"
          style={{ color: CARD_INK_SOFT }}
        />
        <EditableText
          id={`${id}.title`}
          as="p"
          defaultValue={HERO_COPY[`${id}.title`] ?? title}
          className="truncate text-[12.5px] font-bold"
          style={{ color: CARD_INK }}
        />
        <EditableText
          id={`${id}.meta`}
          as="p"
          defaultValue={HERO_COPY[`${id}.meta`] ?? meta}
          className="truncate text-[9px]"
          style={{ color: CARD_INK_SOFT }}
        />
      </div>
    </div>
  );
}

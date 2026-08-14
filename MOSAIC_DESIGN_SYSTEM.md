# Mosaic Design System — portable reference

Source of truth: `Hobbies-app/hobbies-explore-app/src/index.css` (the `@theme`
block) plus the component patterns below. This doc exists so the color/UI
language from **Mosaic** (the Hobbies app) can be applied to other projects
— like Almanac — that don't have this folder mounted. Copy this whole file
into the target project (or paste it into that project's chat) and ask for
these tokens/patterns to be applied there.

Stack this was built in: React + Tailwind CSS v4 (tokens defined via the
`@theme` directive, no separate `tailwind.config`). If the target app uses a
different stack, port the **values** below (they're just hex codes and
sizes) — the Tailwind-specific syntax is only a convenience, not a
requirement.

## Look and feel

DICE-inspired dark theme: a near-black page, off-white ink, and a single
bright "brand" accent (white) used for filled pills and active states —
plus five warm, muted accent colors reserved for the app's five life-area
categories (chips, tags, calendar dots). Serif display font for headlines,
system sans for everything else. Pill-shaped buttons and tags, generously
rounded cards, dark hairline borders instead of shadows for separation.

## Color tokens

```css
@theme {
  /* brand accent — the single bright, high-contrast element (filled
     buttons, active states). White-on-black in this theme. */
  --color-brand: #FFFFFF;
  --color-brand-dark: #F5F3EF;
  --color-brand-light: #232320;
  --color-brand-mid: #8A8579;

  /* text color to put ON TOP of a filled --color-brand (or --color-ink)
     background — near-black, so it stays legible against the light fill */
  --color-on-brand: #0A0A0A;

  /* surfaces */
  --color-bg: #0A0A0A;       /* page background */
  --color-surface: #171613;  /* cards, modals, inputs */
  --color-ink: #F5F3EF;      /* primary text */
  --color-ink-soft: #A39C8C; /* secondary/muted text */
  --color-line: #2C2A25;     /* hairline borders */

  /* secondary accent, used sparingly (e.g. one call-to-action, "grow"
     category) — a warm gold, not the primary brand color */
  --color-gold: #B99A63;
  --color-gold-hover: #A48750;

  /* fonts */
  --font-display: "Fraunces", serif;   /* headlines only */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
}
```

Note: `Fraunces` is referenced but this project never actually loads the
webfont (no `<link>`/`@font-face`), so it silently falls back to system
serif. If the target app wants the real Fraunces look, add:
`<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&display=swap" rel="stylesheet">`

### Category accent colors (use only for tags/chips/dots tied to a category, never as the primary brand color)

| Category | Hex | Note |
|---|---|---|
| Stay Healthy | `#7C8A6B` | sage |
| Stay Creative | `#C97B63` | terracotta |
| Stay Peaceful | `#6D829C` | dusty blue |
| Grow | `#B99A63` | gold — reuses the secondary accent |
| Connect | `#B06A8F` | dusty rose |

## Shape and spacing conventions

- Buttons / pills: fully rounded (`rounded-full`, i.e. `border-radius: 9999px`)
- Cards, modals, inputs: `rounded-xl` (12px) for most surfaces, `rounded-2xl`
  (16px) for bigger containers (e.g. the add-activity form), `rounded-3xl`
  (24px) for full-screen modals
- Borders over shadows: `1px solid var(--color-line)` is the default way to
  separate a card from the page — shadows are rarely used, this is a flat,
  dark UI
- Type scale used in practice: 11–13px for labels/meta text, 13.5px for
  body/buttons, 19–26px for section headers, 36–50px for hero headlines
  (`font-display`, semibold)

## Reusable component patterns

**Pill tag** (e.g. category label):
```tsx
<span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-ink)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--color-ink)]">
  Label
</span>
```

**Primary filled button**:
```tsx
<button className="rounded-xl bg-[color:var(--color-brand)] px-4 py-2.5 text-[13.5px] font-bold text-[color:var(--color-on-brand)] disabled:opacity-40">
  Primary action
</button>
```

**Secondary/outline button**:
```tsx
<button className="rounded-xl border border-[color:var(--color-line)] px-4 py-2.5 text-[13.5px] font-semibold text-[color:var(--color-ink-soft)]">
  Cancel
</button>
```

**Card surface**:
```tsx
<div className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
  ...
</div>
```

**Text input**:
```tsx
<input className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]" />
```

## How to hand this to another project

This file lives in the Hobbies-app project folder, which a different
Cowork/Claude session (like the one pointed at Almanac / "Vision board
2026") won't have access to by default. Two ways to use it there:

1. **Paste it in.** Copy this whole file's contents into that project's
   chat and say "apply these color tokens and component patterns to this
   app."
2. **Mount both folders.** If that session adds `Hobbies-app` as a second
   selected folder, it can read this file directly at
   `hobbies-explore-app/MOSAIC_DESIGN_SYSTEM.md`.

Also worth knowing: `portfolio-site/PROJECT_HANDOFF.md` mentions a shared
`design.md` system (monochrome UI, single accent `#FF6B35`) that
`portfolio-site` already follows — that's a **different** palette from
Mosaic's (orange accent vs. white/gold). Worth deciding whether Almanac
should match Mosaic's look specifically, or the existing shared
`design.md` — they're not the same theme.

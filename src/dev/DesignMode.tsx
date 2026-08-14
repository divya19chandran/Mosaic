import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

/**
 * A small "Figma-like" drag/resize/rotate + click-to-edit-text tool, built to
 * solve a specific pain point from this project's hero section: getting
 * layout and copy right by guessing, asking for a screenshot, re-guessing.
 * `<DesignModeProvider>` owns a single on/off toggle (rendered as a floating
 * button) shared by two independent tools:
 *
 * - `<PositionCanvas>` + `<Positionable>` — drag/resize/rotate absolutely
 *   positioned elements. Saved to src/data/hero-positions.json via the
 *   dev-only `/__design-mode/positions` endpoint.
 * - `<EditableText>` — click-to-edit text, anywhere under
 *   `<DesignModeProvider>` (does NOT need to be inside a `<PositionCanvas>`).
 *   Saved to src/data/hero-copy.json via the dev-only `/__design-mode/text`
 *   endpoint.
 *
 * Both endpoints live in dev/designModePlugin.ts. Both write straight to a
 * JSON file the page imports, so Vite's own JSON-import HMR re-renders with
 * the new value live — no manual translation step in between.
 *
 * Why two separate contexts (`enabled` vs. the positioning canvas) instead of
 * one: `Positionable` needs a measured container box to convert pixel drag
 * deltas into the page's percentage-based top/left values, so it only makes
 * sense inside a `<PositionCanvas>` sized to match the thing being
 * positioned (e.g. just the phone mockup's box, not the whole hero row).
 * `EditableText` has no such requirement — it's just text in normal document
 * flow — and needs to work in sibling columns/sections that were never meant
 * to be a drag canvas (e.g. the headline next to the phone, not inside it).
 * Splitting the toggle out lets `<DesignModeProvider>` wrap an entire
 * section (or page) once, while `<PositionCanvas>` stays scoped to just the
 * elements that actually need drag math.
 *
 * Fully generic (id → value), not tied to "cards" or "phones" — intended to
 * be copied into other React + Vite projects whenever a similar visual
 * layout/copy task comes up. See the design-mode-editor skill.
 *
 * Dev-only: the toggle button, drag/resize/rotate handles, and
 * contentEditable behavior only activate when `import.meta.env.DEV` is true,
 * so none of this appears in a production build.
 */

type Position = { top: string; left: string; width: number; rotate: number };

type EnabledContextValue = { enabled: boolean };

const EnabledContext = createContext<EnabledContextValue | null>(null);

function useEnabled() {
  const ctx = useContext(EnabledContext);
  if (!ctx) throw new Error('Must be used within a DesignModeProvider');
  return ctx;
}

/**
 * Public hook for consumers that need to know whether design mode is on
 * without rendering a `<Positionable>`/`<EditableText>` — e.g. a page that
 * wants to disable a button's normal `onClick` navigation while its label is
 * being edited in place. Must be called under a `<DesignModeProvider>`.
 */
export function useDesignModeEnabled() {
  return useEnabled().enabled;
}

type CanvasContextValue = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerSize: { width: number; height: number };
  reportAnchorHeight: (height: number) => void;
};

const CanvasContext = createContext<CanvasContextValue | null>(null);

function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvas must be used within a PositionCanvas');
  return ctx;
}

const STORAGE_KEY = 'design-mode-enabled';

/**
 * Top-level on/off switch for every dev-mode editing tool on the page:
 * renders the floating "Design mode" toggle button and provides `enabled` to
 * both `<PositionCanvas>` (and its `<Positionable>` children) and any
 * `<EditableText>` anywhere in its subtree. Doesn't render a wrapper div of
 * its own — just a context provider plus the toggle button — so it can wrap
 * as much or as little of the page as needed (a whole section spanning
 * multiple columns, or the whole app) without affecting layout.
 */
export function DesignModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    if (!import.meta.env.DEV) return false;
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // sessionStorage unavailable — dev-tool state just won't persist across reloads
      }
      return next;
    });
  }, []);

  return (
    <EnabledContext.Provider value={{ enabled }}>
      {children}
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={toggle}
          className="fixed bottom-5 right-5 z-50 rounded-full px-4 py-2.5 text-[13px] font-bold shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-colors"
          style={{
            backgroundColor: enabled ? '#B06A8F' : '#171613',
            color: '#F5F3EF',
            border: '1px solid rgba(245,243,239,0.2)',
          }}
        >
          {enabled ? '✓ Design mode on — click to edit' : '🎨 Design mode'}
        </button>
      )}
    </EnabledContext.Provider>
  );
}

/**
 * Wraps the positioned canvas (e.g. the phone + floating cards container).
 * Measures its own box so `<Positionable>` children can convert pixel drag
 * deltas to the percentage-based top/left values the page actually uses.
 * Must be nested inside a `<DesignModeProvider>` (reads `enabled` from it).
 *
 * Container height: if none of the children are in normal document flow
 * (everything is `<Positionable>`, i.e. `position: absolute`), this box has
 * no natural height on its own. Rather than guessing a static min-height
 * (which drifts out of sync with actual content and leaves stray blank
 * space), one `<Positionable isAnchor>` child reports its own live display
 * height via `reportAnchorHeight`, and that becomes this container's
 * min-height — so it tracks the anchor element's real rendered size
 * (including if it's dragged/resized) instead of a hardcoded guess.
 */
export function PositionCanvas({ children, className }: { children: ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [anchorHeight, setAnchorHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const reportAnchorHeight = useCallback((height: number) => {
    setAnchorHeight(Math.round(height));
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', minHeight: anchorHeight ?? undefined }}
    >
      <CanvasContext.Provider value={{ containerRef, containerSize, reportAnchorHeight }}>
        {children}
      </CanvasContext.Provider>
    </div>
  );
}

/**
 * Wraps a single absolutely-positioned element (a floating card, a phone
 * mockup, etc). When design mode is on: drag the body to move it, drag the
 * bottom-right handle to resize, drag the top handle to rotate. Every
 * drag-end saves the new top/left/width/rotate to disk via
 * POST /__design-mode/positions. Must be nested inside a `<PositionCanvas>`.
 *
 * Resize note: `children` is expected to be a fixed-design element (its own
 * intrinsic CSS width — a card template, a phone frame — not something
 * meant to reflow at arbitrary pixel widths). Rather than setting `width` on
 * the child directly (which would just squish/stretch a fixed-width image
 * next to a growing/shrinking text column), `Positionable` measures the
 * child's *natural* unscaled size with a `ResizeObserver`, then resizing
 * applies a uniform `transform: scale()` so the image, text, and padding all
 * scale together — "auto-fit content" instead of reflow.
 *
 * Pass `isAnchor` on whichever element should drive the parent
 * `PositionCanvas`'s height (typically the one big element the others float
 * around, e.g. a phone mockup) — see the height note on `PositionCanvas`
 * above.
 */
export function Positionable({
  id,
  defaultTop,
  defaultLeft,
  defaultWidth,
  defaultRotate,
  isAnchor,
  children,
}: {
  id: string;
  defaultTop: string;
  defaultLeft: string;
  defaultWidth: number;
  defaultRotate: number;
  isAnchor?: boolean;
  children: ReactNode;
}) {
  const { enabled } = useEnabled();
  const { containerSize, reportAnchorHeight } = useCanvas();
  const [pos, setPos] = useState<Position>({
    top: defaultTop,
    left: defaultLeft,
    width: defaultWidth,
    rotate: defaultRotate,
  });
  const contentRef = useRef<HTMLDivElement | null>(null);
  // The child's own unscaled size — e.g. a card template's fixed CSS width,
  // or the phone mockup's `w-[340px] sm:w-[400px]`. Seeded to defaultWidth
  // so the first paint (before ResizeObserver reports) assumes scale ≈ 1
  // rather than scale ≈ Infinity.
  const [natural, setNatural] = useState({ width: defaultWidth, height: 0 });

  // Re-sync when the underlying JSON changes (e.g. HMR after a save, or a
  // manual edit to hero-positions.json), so the live-dragged state never
  // drifts from what's actually on disk.
  useEffect(() => {
    setPos({ top: defaultTop, left: defaultLeft, width: defaultWidth, rotate: defaultRotate });
  }, [defaultTop, defaultLeft, defaultWidth, defaultRotate]);

  // ResizeObserver reports the element's own pre-transform border-box size,
  // so this measurement stays accurate even once `transform: scale()` below
  // is applied to this same element (transforms are paint-only, they don't
  // affect the box a layout measurement sees).
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setNatural({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = natural.width > 0 ? pos.width / natural.width : 1;
  const displayHeight = natural.height > 0 ? natural.height * scale : undefined;

  useEffect(() => {
    if (isAnchor && displayHeight) reportAnchorHeight(displayHeight);
  }, [isAnchor, displayHeight, reportAnchorHeight]);

  const save = useCallback(
    (next: Position) => {
      if (!import.meta.env.DEV) return;
      fetch('/__design-mode/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...next }),
      }).catch(() => {
        // best-effort — the drag already updated the on-screen position either way
      });
    },
    [id],
  );

  const handleMoveStart = (e: ReactPointerEvent) => {
    if (!enabled || containerSize.width === 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startTopPx = (parseFloat(pos.top) / 100) * containerSize.height;
    const startLeftPx = (parseFloat(pos.left) / 100) * containerSize.width;
    let latest = pos;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const leftPct = ((startLeftPx + dx) / containerSize.width) * 100;
      const topPct = ((startTopPx + dy) / containerSize.height) * 100;
      latest = { ...latest, top: `${topPct.toFixed(1)}%`, left: `${leftPct.toFixed(1)}%` };
      setPos(latest);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      save(latest);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleResizeStart = (e: ReactPointerEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = pos.width;
    let latest = pos;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const width = Math.max(80, Math.round(startWidth + dx));
      latest = { ...latest, width };
      setPos(latest);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      save(latest);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleRotateStart = (e: ReactPointerEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startRotate = pos.rotate;
    let latest = pos;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const rotate = Math.max(-45, Math.min(45, Math.round(startRotate + dx * 0.3)));
      latest = { ...latest, rotate };
      setPos(latest);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      save(latest);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className={enabled ? 'absolute' : 'absolute hidden sm:block'}
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        height: displayHeight,
        transform: `rotate(${pos.rotate}deg)`,
      }}
    >
      <div
        ref={contentRef}
        onPointerDown={handleMoveStart}
        style={{
          // `fit-content` (not `w-full`/100%) so this box always shrink-wraps
          // to the child's own intrinsic size — that's what makes the
          // ResizeObserver measurement above reflect the child's *natural*
          // size rather than whatever width this wrapper happens to have.
          width: 'fit-content',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          ...(enabled ? { cursor: 'grab', outline: '2px dashed #B06A8F', outlineOffset: 3, borderRadius: 18 } : {}),
        }}
      >
        {children}
      </div>

      {enabled && (
        <>
          <div
            onPointerDown={handleRotateStart}
            title="Drag to rotate"
            className="absolute flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ top: -26, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#6D829C', cursor: 'grab' }}
          >
            ↻
          </div>
          <div
            onPointerDown={handleResizeStart}
            title="Drag to resize"
            className="absolute h-4 w-4 rounded-sm"
            style={{ bottom: -6, right: -6, backgroundColor: '#B99A63', cursor: 'nwse-resize' }}
          />
          <div
            className="absolute whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[9px] text-white"
            style={{ bottom: -22, left: 0, backgroundColor: 'rgba(0,0,0,0.75)' }}
          >
            {id}: top {pos.top}, left {pos.left}, w {pos.width}, rot {pos.rotate}°
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Click-to-edit text, the copy counterpart to `<Positionable>`. When design
 * mode is on, the element becomes `contentEditable`; on blur (not on every
 * keystroke) the new text is saved to `src/data/hero-copy.json` via
 * POST /__design-mode/text, and the page picks it up live via Vite's
 * JSON-import HMR — same "edit directly on the page, no chat round-trip"
 * flow as dragging. Needs only a `<DesignModeProvider>` ancestor — unlike
 * `<Positionable>`, it does NOT need to be inside a `<PositionCanvas>`, since
 * it's normal-flow text with no drag math involved.
 *
 * Update-on-blur-only is deliberate, not an oversight: `contentEditable` +
 * React state on every keystroke is a classic footgun — a mid-typing
 * re-render replaces the DOM node's content out from under the browser's
 * native cursor, so the caret jumps to the start (or end) of the text after
 * every character. Only syncing React state (and disk) once editing finishes
 * sidesteps that entirely, since the DOM owns the text while the user types.
 *
 * `id` is the key under which the text is stored in hero-copy.json (e.g.
 * `"headline"`, `"pottery.title"`) — same generic id → value store as
 * positions, just holding strings instead of {top,left,width,rotate}.
 */
// Narrowed on purpose: this component is only ever used for plain text
// containers (headline, subhead, button labels, card copy). `keyof
// JSX.IntrinsicElements` (all HTML *and* SVG tags) makes TS try to intersect
// every element's event-handler types when used as a dynamic tag, which
// blows up onBlur/onKeyDown into an unsatisfiable type. A small fixed union
// keeps the handler types simple and is all this component needs.
type EditableTextTag = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div' | 'label';

export function EditableText({
  id,
  defaultValue,
  as,
  className,
  style,
}: {
  id: string;
  defaultValue: string;
  as?: EditableTextTag;
  className?: string;
  style?: CSSProperties;
}) {
  const { enabled } = useEnabled();
  // Cast to `any` only for the dynamic-tag render below — the public `as`
  // prop above stays narrowly typed, which is what actually matters for
  // callers.
  const Component = (as ?? 'span') as unknown as 'span';
  const [value, setValue] = useState(defaultValue);

  // Re-sync when the underlying JSON changes (HMR after a save, or a manual
  // edit to hero-copy.json), same pattern as Positionable's position re-sync.
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const save = useCallback(
    (next: string) => {
      if (!import.meta.env.DEV) return;
      fetch('/__design-mode/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, value: next }),
      }).catch(() => {
        // best-effort — the DOM already shows the new text either way
      });
    },
    [id],
  );

  const handleBlur = (e: ReactFocusEvent<HTMLElement>) => {
    const next = e.currentTarget.textContent ?? '';
    if (next !== value) {
      setValue(next);
      save(next);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    // Single-line data model (one JSON string per id) — Enter commits
    // instead of inserting a newline.
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      e.currentTarget.textContent = value;
      e.currentTarget.blur();
    }
  };

  return (
    <Component
      contentEditable={enabled}
      suppressContentEditableWarning
      onBlur={enabled ? handleBlur : undefined}
      onKeyDown={enabled ? handleKeyDown : undefined}
      className={className}
      style={{
        ...style,
        ...(enabled
          ? { outline: '2px dashed #6D829C', outlineOffset: 2, cursor: 'text', borderRadius: 4 }
          : {}),
      }}
    >
      {value}
    </Component>
  );
}

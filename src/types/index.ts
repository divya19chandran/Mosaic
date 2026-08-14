/**
 * Core data model for the Explore surface.
 *
 * Milestone 1 is manual-add only: a person pastes a link (we guess a title
 * from it) or fills a quick form, and that becomes an Activity in their own
 * list. There is no curated marketplace, no rich venue/price/trust data —
 * just what the person actually entered. Later milestones (Search/Connect)
 * can layer richer sourcing on top without changing this shape much.
 */

export type CategoryId = 'healthy' | 'creative' | 'peaceful' | 'grow' | 'connect';

export interface Category {
  id: CategoryId;
  name: string;
  outcome: string;
  /**
   * Hex color used for calendar color-coding only (see CalendarPage). The
   * rest of the app is intentionally monochrome (see index.css) — this is
   * semantic/content color like the app's other category-driven UI, not a
   * second brand accent, scoped to the one surface where telling categories
   * apart at a glance actually matters (spotting overlap/double-booking).
   */
  color: string;
}

export interface Activity {
  id: string;
  title: string;
  category: CategoryId;
  link?: string; // optional source link the person pasted in
  date?: string; // optional free-text display date, e.g. "Sat, Aug 2, 2026"
  dateStart?: string; // optional structured "YYYY-MM-DD" — powers the calendar filter
  dateEnd?: string; // optional "YYYY-MM-DD"; unset means a single-day event (same as dateStart)
  time?: string; // optional free-text time/time-range, e.g. "5:30 PM – 8:00 PM"
  location?: string; // optional free-text venue/address
  notes?: string; // optional personal notes
  imageDataUrl?: string; // optional screenshot the person uploaded, stored as a data URL
  addedAt: string; // ISO timestamp, set automatically when added
  source?: SourceSite; // which external site this was pulled in from, if any (unset = added manually)
}

/**
 * The external sites Discover pulls sample events from, plus 'instagram' as a
 * label for the screenshot-upload path and 'manual' for anything a person
 * typed or pasted in themselves. Only used for the little source badge — it
 * never changes how an Activity behaves.
 */
export type SourceSite =
  | 'eventbrite'
  | 'dice'
  | 'residentadvisor'
  | 'bucketlisters'
  | 'partiful'
  | 'nycparks'
  | 'instagram'
  | 'manual';

export interface SourceMeta {
  id: SourceSite;
  label: string; // shown in the "via ___" badge
}

/** The fields OCR/autofill can guess — also the field set evals/scoring.mjs judges. */
export type OcrFieldName = 'title' | 'category' | 'date' | 'time' | 'location' | 'notes';

/**
 * One field's guessed-vs-corrected pair inside an OcrFeedbackEntry. `wrong`
 * is a person's explicit judgment call (defaulted from a guessed/corrected
 * diff, but editable) — not inferred silently, since a field can look
 * "different" from a raw string compare and still be a fine paraphrase.
 */
export interface OcrFieldFeedback {
  guessed: string; // what the app auto-filled from OCR (possibly '')
  corrected: string; // what the person says it should be (possibly '' if it should have stayed blank)
  wrong: boolean; // whether this field is being flagged as a miss
}

/**
 * A person-flagged "this OCR guess wasn't right" report, captured on-device
 * from the Add-activity screenshot flow. This is the seed data for growing
 * evals/historical-cases.mjs and evals/fixtures/ with real examples instead
 * of synthetic ones — see EVALS.md's "keep the actual file" note. Crucially
 * this DOES keep the actual file: `imageDataUrl` is the real uploaded
 * screenshot, not just a transcription of what went wrong.
 */
export interface OcrFeedbackEntry {
  id: string;
  createdAt: string; // ISO timestamp
  imageDataUrl: string; // the actual screenshot (compressed), same as Activity.imageDataUrl
  ocrStatus: 'done' | 'error'; // whether OCR completed at all for this screenshot
  fields: Record<OcrFieldName, OcrFieldFeedback>;
  note?: string; // optional freeform context, e.g. "blurry screenshot" or "garbled OCR text"
}

/**
 * A single real event pulled from one of the partner sites, shown in the
 * Discover feed. This is a read-only snapshot (see src/data/discoverEvents.ts
 * for how/when it was gathered) — a person adds one of these to their own
 * list via "Add to my list", at which point it becomes a normal Activity.
 */
export interface DiscoverEvent {
  id: string;
  title: string;
  category: CategoryId;
  source: SourceSite;
  link: string;
  date?: string;
  dateStart?: string; // optional structured "YYYY-MM-DD" — powers the calendar filter
  dateEnd?: string; // optional "YYYY-MM-DD"; unset means a single-day event (same as dateStart)
  location?: string;
  lat?: number; // approximate venue coordinates — powers "sort by distance" in Discover
  lng?: number;
  blurb?: string;
}

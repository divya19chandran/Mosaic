import { useRef, useState } from 'react';
import { CATEGORIES } from '../data/categories';
import type { CategoryId, OcrFieldFeedback, OcrFieldName, SourceSite } from '../types';
import type { NewActivityInput } from '../hooks/useMyActivities';
import { useOcrFeedback } from '../hooks/useOcrFeedback';
import {
  guessCategory,
  guessDateFromText,
  guessDescriptionFromText,
  guessLocationFromText,
  guessTimeFromText,
  guessTitleFromLines,
  guessTitleFromUrl,
} from '../lib/autofill';
import { extractTextFromImage, toCompressedDataUrl } from '../lib/screenshot';
import { fetchLinkMetadata } from '../lib/linkExtract';
import { formatDateLabel } from '../lib/date';
import OcrFeedbackReview from './OcrFeedbackReview';

type OcrStatus = 'idle' | 'reading' | 'done' | 'error';
type LinkStatus = 'idle' | 'loading' | 'done' | 'error';

export default function AddActivityForm({
  onAdd,
  onCancel,
  initialDate,
  initialValues,
  requireDate,
  dateHint,
}: {
  onAdd: (input: NewActivityInput) => void;
  onCancel: () => void;
  /** Optional "YYYY-MM-DD" to prefill the date field with — e.g. when opened by clicking a day on CalendarView. */
  initialDate?: string;
  /**
   * Optional starting values — e.g. when opened from a Discover card so the
   * title/category/link/location/notes/source don't have to be retyped.
   * Fields set here are treated as already "touched" so link/screenshot
   * autofill won't silently overwrite them.
   */
  initialValues?: {
    title?: string;
    category?: CategoryId;
    link?: string;
    location?: string;
    notes?: string;
    source?: SourceSite;
  };
  /** When true, a date must be chosen before submitting (see the Discover "no fixed date" flow). */
  requireDate?: boolean;
  /** Optional helper text shown under the date field, e.g. explaining why a date is required here. */
  dateHint?: string;
}) {
  const [link, setLink] = useState(initialValues?.link ?? '');
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [titleTouched, setTitleTouched] = useState(!!initialValues?.title);
  const [category, setCategory] = useState<CategoryId | ''>(initialValues?.category ?? '');
  const [categoryTouched, setCategoryTouched] = useState(!!initialValues?.category);
  const [dateISO, setDateISO] = useState(initialDate ?? ''); // "YYYY-MM-DD" from the date picker, or '' for no date
  // If a date was passed in explicitly (calendar day click), treat it as
  // already "touched" so link/screenshot autofill won't silently overwrite
  // the day the person deliberately clicked.
  const [dateTouched, setDateTouched] = useState(!!initialDate);
  const [time, setTime] = useState('');
  const [timeTouched, setTimeTouched] = useState(false);
  const [location, setLocation] = useState(initialValues?.location ?? '');
  const [locationTouched, setLocationTouched] = useState(!!initialValues?.location);
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [notesTouched, setNotesTouched] = useState(!!initialValues?.notes);
  // Not user-editable — carried through from the Discover card (if any) so a
  // saved activity still shows its real source badge instead of "manual".
  const [source] = useState<SourceSite | undefined>(initialValues?.source);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('idle');
  // Raw OCR guesses for this screenshot, captured independent of whether a
  // field was already "touched" (and so skipped by autofill) — this is what
  // the review panel below diffs against the live form to build feedback.
  const [ocrGuess, setOcrGuess] = useState<Record<OcrFieldName, string> | null>(null);
  const [showFeedbackReview, setShowFeedbackReview] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const { addEntry: addOcrFeedback } = useOcrFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guards against a slower, earlier lookup overwriting the form after the
  // person has already pasted a different link and blurred again.
  const linkRequestIdRef = useRef(0);

  const applyCategoryGuess = (text: string) => {
    if (categoryTouched) return;
    const guess = guessCategory(text);
    if (guess) setCategory(guess);
  };

  const handleLinkBlur = async () => {
    const trimmed = link.trim();
    if (!trimmed) return;

    // Always apply the fast, synchronous slug-based guess immediately —
    // this works offline and doesn't depend on the target site publishing
    // any metadata, so it's a reasonable baseline while the richer lookup
    // (below) is in flight.
    if (!titleTouched) {
      const guess = guessTitleFromUrl(trimmed);
      if (guess) setTitle(guess);
    }
    applyCategoryGuess(`${trimmed} ${title}`);

    const requestId = ++linkRequestIdRef.current;
    setLinkStatus('loading');
    const metadata = await fetchLinkMetadata(trimmed);
    if (requestId !== linkRequestIdRef.current) return; // a newer lookup superseded this one

    if (!metadata) {
      // A page not publishing rich metadata is expected and common (or the
      // fetch simply failed) — quietly fall back to the slug guess already
      // applied above rather than showing an error.
      setLinkStatus('idle');
      return;
    }

    if (!titleTouched && metadata.title) setTitle(metadata.title);
    if (!dateTouched && metadata.date) setDateISO(metadata.date);
    if (!timeTouched && metadata.time) setTime(metadata.time);
    if (!locationTouched && metadata.location) setLocation(metadata.location);
    applyCategoryGuess(`${trimmed} ${metadata.title ?? title} ${metadata.description ?? ''}`);
    setLinkStatus('done');
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrStatus('reading');
    setOcrGuess(null);
    setShowFeedbackReview(false);
    setFeedbackSaved(false);
    try {
      const thumbnail = await toCompressedDataUrl(file);
      setImageDataUrl(thumbnail);
    } catch {
      // if downscaling fails for any reason, we just skip storing a thumbnail
    }

    try {
      const { text, lines } = await extractTextFromImage(file);
      // Compute every guess unconditionally (not just for untouched fields)
      // so the feedback snapshot below reflects what OCR actually guessed,
      // not what ended up on screen after touched-field skipping.
      const titleGuess = guessTitleFromLines(lines, text);
      const dateGuess = guessDateFromText(text);
      const timeGuess = guessTimeFromText(text);
      const locationGuess = guessLocationFromText(text);
      const notesGuess = guessDescriptionFromText(text, titleGuess ?? title);
      const categoryGuess = guessCategory(text);

      if (!titleTouched && titleGuess) setTitle(titleGuess);
      if (!dateTouched && dateGuess) setDateISO(dateGuess);
      if (!timeTouched && timeGuess) setTime(timeGuess);
      if (!locationTouched && locationGuess) setLocation(locationGuess);
      if (!notesTouched && notesGuess) setNotes(notesGuess);
      if (!categoryTouched && categoryGuess) setCategory(categoryGuess);

      setOcrGuess({
        title: titleGuess ?? '',
        category: categoryGuess ?? '',
        date: dateGuess ?? '',
        time: timeGuess ?? '',
        location: locationGuess ?? '',
        notes: notesGuess ?? '',
      });
      setOcrStatus('done');
    } catch (err) {
      // Surface the real failure in devtools — the UI only ever shows a
      // generic "couldn't read text" message, so without this the actual
      // cause (decode error, worker/network issue, etc.) is invisible.
      console.error('OCR failed', err);
      // Still snapshot an (all-blank) guess so this can be flagged as
      // feedback too — a pipeline failure is exactly the kind of thing
      // worth capturing for evals, same as a wrong-field guess.
      setOcrGuess({ title: '', category: '', date: '', time: '', location: '', notes: '' });
      setOcrStatus('error');
    }
  };

  const removeScreenshot = () => {
    setImageDataUrl(undefined);
    setOcrStatus('idle');
    setOcrGuess(null);
    setShowFeedbackReview(false);
    setFeedbackSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveOcrFeedback = (fields: Record<OcrFieldName, OcrFieldFeedback>, note: string) => {
    if (!imageDataUrl) return;
    addOcrFeedback({
      imageDataUrl,
      ocrStatus: ocrStatus === 'error' ? 'error' : 'done',
      fields,
      note: note || undefined,
    });
    setShowFeedbackReview(false);
    setFeedbackSaved(true);
  };

  const canSubmit = title.trim().length > 0 && category !== '' && (!requireDate || dateISO !== '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd({
      title: title.trim(),
      category: category as CategoryId,
      link: link.trim() || undefined,
      date: dateISO ? formatDateLabel(dateISO) : undefined,
      dateStart: dateISO || undefined,
      dateEnd: dateISO || undefined,
      time: time.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      imageDataUrl,
      source,
    });
    setLink('');
    setLinkStatus('idle');
    linkRequestIdRef.current += 1; // invalidate any still-in-flight lookup for the just-submitted link
    setTitle('');
    setTitleTouched(false);
    setCategory('');
    setCategoryTouched(false);
    setDateISO('');
    setDateTouched(false);
    setTime('');
    setTimeTouched(false);
    setLocation('');
    setLocationTouched(false);
    setNotes('');
    setNotesTouched(false);
    removeScreenshot();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4"
    >
      <div className="text-[13px] font-bold">Add something to your list</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
            Paste a link (optional)
          </label>
          <input
            type="url"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              if (linkStatus !== 'idle') setLinkStatus('idle');
            }}
            onBlur={handleLinkBlur}
            placeholder="https://…"
            className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
          />
          {linkStatus === 'loading' && (
            <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]">
              Looking up details from the link…
            </div>
          )}
          {linkStatus === 'done' && (
            <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]">
              Pulled details from the link — check them below.
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
            Or upload a screenshot (optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshotChange}
            className="w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-[12.5px] outline-none file:mr-2 file:rounded-full file:border-0 file:bg-[color:var(--color-brand-light)] file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-[color:var(--color-brand-dark)]"
          />
        </div>
      </div>

      {imageDataUrl && (
        <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] p-2.5">
          <div className="flex items-center gap-3">
            <img src={imageDataUrl} alt="Uploaded screenshot" className="h-14 w-14 rounded-lg object-cover" />
            <div className="flex-1 text-[12px] text-[color:var(--color-ink-soft)]">
              {ocrStatus === 'reading' && 'Reading text from your screenshot…'}
              {ocrStatus === 'done' && 'Pulled a title, category, date/time, location, and description guess from the screenshot — check them below.'}
              {ocrStatus === 'error' && "Couldn't read text from this image, but it's still attached — fill in the details below."}
            </div>
            <button
              type="button"
              onClick={removeScreenshot}
              className="shrink-0 text-[11.5px] font-bold text-[color:var(--color-ink-soft)]"
            >
              Remove
            </button>
          </div>
          {ocrGuess && (ocrStatus === 'done' || ocrStatus === 'error') && (
            <div className="flex items-center gap-2 pl-1">
              {feedbackSaved ? (
                <span className="text-[11.5px] font-semibold text-[color:var(--color-brand-dark)]">
                  ✓ Feedback saved — find it later under Profile → OCR feedback.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFeedbackReview(true)}
                  className="text-[11.5px] font-bold text-[color:var(--color-brand-dark)] underline underline-offset-2"
                >
                  {ocrStatus === 'error' ? "This didn't work at all — flag it" : "Something look off? Flag it for review"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showFeedbackReview && ocrGuess && imageDataUrl && (
        <OcrFeedbackReview
          imageDataUrl={imageDataUrl}
          ocrStatus={ocrStatus === 'error' ? 'error' : 'done'}
          guess={ocrGuess}
          current={{
            title,
            category,
            date: dateISO,
            time,
            location,
            notes,
          }}
          onSave={handleSaveOcrFeedback}
          onClose={() => setShowFeedbackReview(false)}
        />
      )}

      <div>
        <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleTouched(true);
          }}
          placeholder="What is it?"
          className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as CategoryId);
              setCategoryTouched(true);
            }}
            className="w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
          >
            <option value="" disabled>
              Choose one…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
            {requireDate ? 'Date' : 'Date (optional)'}
          </label>
          <input
            type="date"
            value={dateISO}
            required={requireDate}
            onChange={(e) => {
              setDateISO(e.target.value);
              setDateTouched(true);
            }}
            className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
          />
          {requireDate && (
            <p className="mt-1 text-[11px] text-[color:var(--color-ink-soft)]">
              {dateHint ?? "This one doesn't map to a single fixed day — pick the date you're actually going."}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
            Time (optional)
          </label>
          <input
            type="text"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setTimeTouched(true);
            }}
            placeholder="e.g. 5:30 PM – 8:00 PM"
            className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
            Location (optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setLocationTouched(true);
            }}
            placeholder="Venue or address"
            className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesTouched(true);
          }}
          rows={2}
          placeholder="Anything you want to remember about this"
          className="w-full resize-none rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 rounded-xl bg-[color:var(--color-brand)] px-4 py-2.5 text-[13.5px] font-bold text-[color:var(--color-on-brand)] disabled:opacity-40"
        >
          Add to my list
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[color:var(--color-line)] px-4 py-2.5 text-[13.5px] font-semibold text-[color:var(--color-ink-soft)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

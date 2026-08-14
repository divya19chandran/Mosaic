import { useState } from 'react';
import { CATEGORIES } from '../data/categories';
import type { OcrFieldFeedback, OcrFieldName } from '../types';

const FIELD_LABELS: Record<OcrFieldName, string> = {
  title: 'Title',
  category: 'Category',
  date: 'Date',
  time: 'Time',
  location: 'Location',
  notes: 'Notes',
};

const FIELD_ORDER: OcrFieldName[] = ['title', 'category', 'date', 'time', 'location', 'notes'];

function normalize(v: string): string {
  return v.trim().toLowerCase();
}

/**
 * Small "flag this OCR result" review panel, opened from AddActivityForm
 * once a screenshot has been processed. Pre-fills each field's correction
 * with whatever is currently in the form (so if the person already fixed a
 * wrong guess by hand, that fix is captured automatically) and defaults the
 * "wrong" flag from a guessed-vs-current diff, but leaves both editable —
 * this becomes one evals/scoring.mjs-shaped OcrFeedbackEntry, saved locally
 * via useOcrFeedback and reviewable/exportable from Profile.
 */
export default function OcrFeedbackReview({
  imageDataUrl,
  ocrStatus,
  guess,
  current,
  onSave,
  onClose,
}: {
  imageDataUrl: string;
  ocrStatus: 'done' | 'error';
  guess: Record<OcrFieldName, string>;
  current: Record<OcrFieldName, string>;
  onSave: (fields: Record<OcrFieldName, OcrFieldFeedback>, note: string) => void;
  onClose: () => void;
}) {
  const [corrections, setCorrections] = useState<Record<OcrFieldName, string>>(current);
  const [wrongFlags, setWrongFlags] = useState<Record<OcrFieldName, boolean>>(() => {
    const initial = {} as Record<OcrFieldName, boolean>;
    for (const field of FIELD_ORDER) {
      initial[field] = normalize(guess[field]) !== normalize(current[field]);
    }
    return initial;
  });
  const [note, setNote] = useState('');

  const anyFlagged = FIELD_ORDER.some((f) => wrongFlags[f]);

  const handleSave = () => {
    const fields = {} as Record<OcrFieldName, OcrFieldFeedback>;
    for (const field of FIELD_ORDER) {
      fields[field] = {
        guessed: guess[field],
        corrected: corrections[field],
        wrong: wrongFlags[field],
      };
    }
    onSave(fields, note.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16" onClick={onClose}>
      <div
        className="flex w-full max-w-lg flex-col gap-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <img src={imageDataUrl} alt="Uploaded screenshot" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          <div>
            <div className="text-[13px] font-bold">Flag this OCR result</div>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
              {ocrStatus === 'error'
                ? "OCR failed to read this image at all — saving this as-is is still useful, it flags a pipeline failure."
                : "Check each field below. Anything already fixed in the form is pulled in automatically — just confirm or adjust which ones were actually wrong."}
            </p>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-[color:var(--color-line)]">
          {FIELD_ORDER.map((field) => (
            <div key={field} className="flex flex-col gap-1.5 py-2.5 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-[color:var(--color-ink)]">{FIELD_LABELS[field]}</span>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--color-ink-soft)]">
                  <input
                    type="checkbox"
                    checked={wrongFlags[field]}
                    onChange={(e) => setWrongFlags((prev) => ({ ...prev, [field]: e.target.checked }))}
                  />
                  Wrong
                </label>
              </div>
              <div className="text-[11px] text-[color:var(--color-ink-soft)]">
                Guessed: <span className="italic">{guess[field] ? `"${guess[field]}"` : '— left blank —'}</span>
              </div>
              {field === 'category' ? (
                <select
                  value={corrections[field]}
                  onChange={(e) => setCorrections((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 text-[12.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                >
                  <option value="">— none —</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : field === 'date' ? (
                <input
                  type="date"
                  value={corrections[field]}
                  onChange={(e) => setCorrections((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2 text-[12.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                />
              ) : (
                <input
                  type="text"
                  value={corrections[field]}
                  onChange={(e) => setCorrections((prev) => ({ ...prev, [field]: e.target.value }))}
                  placeholder="Correct value (leave blank if it should have stayed blank)"
                  className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2 text-[12.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                />
              )}
            </div>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. blurry screenshot, garbled OCR text, weird layout…"
            className="w-full resize-none rounded-xl border border-[color:var(--color-line)] px-3 py-2 text-[12.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
          />
        </div>

        {!anyFlagged && (
          <p className="text-[11px] text-[color:var(--color-ink-soft)]">
            Nothing is flagged as wrong yet — that's fine to save too (a clean pass is useful data), or check the fields
            that were actually off.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-[color:var(--color-brand)] px-4 py-2.5 text-[13px] font-bold text-[color:var(--color-on-brand)]"
          >
            Save feedback
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[color:var(--color-line)] px-4 py-2.5 text-[13px] font-semibold text-[color:var(--color-ink-soft)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

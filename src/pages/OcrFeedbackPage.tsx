import { useOcrFeedback } from '../hooks/useOcrFeedback';
import type { OcrFeedbackEntry, OcrFieldName } from '../types';

const FIELD_LABELS: Record<OcrFieldName, string> = {
  title: 'Title',
  category: 'Category',
  date: 'Date',
  time: 'Time',
  location: 'Location',
  notes: 'Notes',
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function summarizeEntry(entry: OcrFeedbackEntry): string {
  const wrongFields = (Object.keys(entry.fields) as OcrFieldName[]).filter((f) => entry.fields[f].wrong);
  if (entry.ocrStatus === 'error') return 'OCR pipeline failure — never produced a result';
  if (wrongFields.length === 0) return 'No fields flagged (clean pass)';
  return `${wrongFields.map((f) => FIELD_LABELS[f]).join(', ')} flagged wrong`;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * On-device review + export screen for evals/scoring.mjs-shaped OCR
 * feedback captured via AddActivityForm's "Flag this OCR result" flow (see
 * OcrFeedbackReview). This app is client-only with no backend, so this is
 * the hand-off point: everything here lives in localStorage on this device
 * only, and "Export" is how it gets off the phone and back to a real eval
 * fixture — each entry already carries the actual screenshot (imageDataUrl)
 * plus the guessed/corrected/wrong verdict per field, so an export can
 * become a evals/fixtures/ file + evals/historical-cases.mjs entry (or a new
 * live manifest case) close to verbatim.
 */
export default function OcrFeedbackPage({ onBack }: { onBack: () => void }) {
  const { entries, removeEntry, clearAll } = useOcrFeedback();

  const exportAll = () => {
    downloadJson(`mosaic-ocr-feedback-${new Date().toISOString().slice(0, 10)}.json`, entries);
  };

  const exportOne = (entry: OcrFeedbackEntry) => {
    downloadJson(`mosaic-ocr-feedback-${entry.id}.json`, entry);
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <button
          onClick={onBack}
          className="mb-2 text-[11.5px] font-bold text-[color:var(--color-brand-dark)] underline underline-offset-2"
        >
          ← Back to profile
        </button>
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
          Testing
        </div>
        <h1 className="text-[26px] font-bold leading-tight text-[color:var(--color-ink)]">OCR feedback</h1>
        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[color:var(--color-ink-soft)]">
          Everything you flag from the screenshot-upload flow lands here, saved only on this device. Export it and
          send the file back so it can be folded into the real eval suite — the export includes the actual
          screenshots, not just a description of what went wrong.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-[13px] text-[color:var(--color-ink-soft)]">
          Nothing flagged yet — upload a screenshot in Explore and use "Flag this OCR result" if a guess looks wrong.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-semibold text-[color:var(--color-ink-soft)]">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} saved on this device
            </span>
            <button
              onClick={exportAll}
              className="ml-auto rounded-full bg-[color:var(--color-brand)] px-3.5 py-1.5 text-[12px] font-bold text-[color:var(--color-on-brand)]"
            >
              Export all as JSON
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete all ${entries.length} feedback entries from this device? This can't be undone.`)) {
                  clearAll();
                }
              }}
              className="rounded-full border border-[color:var(--color-line)] px-3.5 py-1.5 text-[12px] font-semibold text-[color:var(--color-ink-soft)]"
            >
              Clear all
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3"
              >
                <img
                  src={entry.imageDataUrl}
                  alt="Flagged screenshot"
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-[color:var(--color-ink)]">{summarizeEntry(entry)}</div>
                  <div className="mt-0.5 text-[11px] text-[color:var(--color-ink-soft)]">
                    {formatTimestamp(entry.createdAt)}
                  </div>
                  {entry.note && (
                    <p className="mt-1 text-[11.5px] italic leading-relaxed text-[color:var(--color-ink-soft)]">
                      "{entry.note}"
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <button
                    onClick={() => exportOne(entry)}
                    className="text-[11px] font-bold text-[color:var(--color-brand-dark)] underline underline-offset-2"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="text-[11px] font-semibold text-[color:var(--color-ink-soft)] underline underline-offset-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

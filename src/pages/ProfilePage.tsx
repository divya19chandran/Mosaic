import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { useMyActivities } from '../hooks/useMyActivities';
import { useOcrFeedback } from '../hooks/useOcrFeedback';
import { CATEGORIES, categoryById } from '../data/categories';
import type { CategoryId } from '../types';
import OcrFeedbackPage from './OcrFeedbackPage';

function formatMonthYear(iso: string): string {
  try {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Personal-summary profile page — no social graph or friends list (that's
 * what the still-"soon" Connect tab is for). Just who you are, how long
 * you've been using Hobbies, and a quiet rollup of what you've added.
 */
export default function ProfilePage() {
  const { name, joinedAt, updateName } = useProfile();
  const { activities } = useMyActivities();
  const { entries: ocrFeedbackEntries } = useOcrFeedback();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [view, setView] = useState<'summary' | 'feedback'>('summary');

  const totalActivities = activities.length;
  const categoriesTried = new Set(activities.map((a) => a.category)).size;
  const reflectionCount = activities.filter((a) => a.notes && a.notes.trim().length > 0).length;

  const mostCommonCategory = (() => {
    if (activities.length === 0) return undefined;
    const counts = new Map<string, number>();
    for (const a of activities) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return topId ? categoryById(topId as CategoryId) : undefined;
  })();

  const saveName = () => {
    updateName(draftName);
    setEditing(false);
  };

  if (view === 'feedback') {
    return <OcrFeedbackPage onBack={() => setView('summary')} />;
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
          Profile
        </div>
        <h1 className="text-[26px] font-bold leading-tight text-[color:var(--color-ink)]">Your Mosaic summary</h1>
      </div>

      <div className="flex flex-col items-start gap-5 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-ink)] text-[20px] font-bold text-[color:var(--color-on-brand)]">
          {initialsFor(name)}
        </div>

        <div className="flex-1">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="rounded-xl border border-[color:var(--color-line)] px-3 py-2 text-[15px] font-bold outline-none focus:border-[color:var(--color-brand-mid)]"
              />
              <button
                onClick={saveName}
                className="rounded-full bg-[color:var(--color-brand)] px-3.5 py-2 text-[12.5px] font-bold text-[color:var(--color-on-brand)]"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setDraftName(name);
                  setEditing(false);
                }}
                className="rounded-full border border-[color:var(--color-line)] px-3.5 py-2 text-[12.5px] font-semibold text-[color:var(--color-ink-soft)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="text-[19px] font-bold text-[color:var(--color-ink)]">{name}</div>
              <button
                onClick={() => setEditing(true)}
                className="text-[12px] font-bold text-[color:var(--color-ink-soft)] underline underline-offset-2"
              >
                Edit
              </button>
            </div>
          )}
          <div className="mt-0.5 text-[13px] text-[color:var(--color-ink-soft)]">
            Member since {formatMonthYear(joinedAt)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Activities saved" value={totalActivities} />
        <StatCard label="Categories tried" value={`${categoriesTried} of ${CATEGORIES.length}`} />
        <StatCard label="Reflections written" value={reflectionCount} />
      </div>

      {mostCommonCategory && (
        <div className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
            Your most-added category
          </div>
          <div className="text-[16px] font-bold text-[color:var(--color-ink)]">{mostCommonCategory.name}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-ink-soft)]">
            {mostCommonCategory.outcome}
          </p>
        </div>
      )}

      {totalActivities === 0 && (
        <p className="text-[13px] text-[color:var(--color-ink-soft)]">
          You haven't added anything yet — head to Explore to start your list.
        </p>
      )}

      <button
        onClick={() => setView('feedback')}
        className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 text-left"
      >
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
            Testing
          </div>
          <div className="text-[15px] font-bold text-[color:var(--color-ink)]">OCR feedback</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
            {ocrFeedbackEntries.length === 0
              ? 'Nothing flagged yet from the screenshot-upload flow.'
              : `${ocrFeedbackEntries.length} ${ocrFeedbackEntries.length === 1 ? 'entry' : 'entries'} saved on this device — review and export.`}
          </p>
        </div>
        <span className="text-[13px] font-bold text-[color:var(--color-brand-dark)]">→</span>
      </button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
      <div className="text-[24px] font-bold text-[color:var(--color-ink)]">{value}</div>
      <div className="mt-0.5 text-[12.5px] font-semibold text-[color:var(--color-ink-soft)]">{label}</div>
    </div>
  );
}

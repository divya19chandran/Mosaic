import { useState } from 'react';
import { CATEGORIES, categoryById } from '../data/categories';
import type { Activity, CategoryId } from '../types';
import { formatDateLabel } from '../lib/date';
import CategoryTag from './CategoryTag';
import SourceBadge from './SourceBadge';

/** Today as a "YYYY-MM-DD" string, for comparing against an activity's dateEnd/dateStart. */
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ActivityDetailModal({
  activity,
  onRemove,
  onClose,
  onUpdate,
}: {
  activity: Activity;
  onRemove: () => void;
  onClose: () => void;
  onUpdate: (patch: Partial<Activity>) => void;
}) {
  const c = categoryById(activity.category);
  const [draft, setDraft] = useState(activity.notes ?? '');
  const [editingJournal, setEditingJournal] = useState(false);

  const effectiveEnd = activity.dateEnd || activity.dateStart;
  const hasPassed = !!effectiveEnd && effectiveEnd < todayISO();

  const saveJournal = () => {
    onUpdate({ notes: draft.trim() || undefined });
    setEditingJournal(false);
  };

  // Editing the activity's own details (title/category/date/time/location/
  // link/notes) — separate from the post-event "journal reflection" above,
  // which only appears once hasPassed. This covers fixing a typo, correcting
  // a wrong date pulled in from autofill, etc., for any saved activity.
  const [editingDetails, setEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState(activity.title);
  const [editCategory, setEditCategory] = useState<CategoryId>(activity.category);
  const [editDateISO, setEditDateISO] = useState(activity.dateStart ?? '');
  const [editTime, setEditTime] = useState(activity.time ?? '');
  const [editLocation, setEditLocation] = useState(activity.location ?? '');
  const [editLink, setEditLink] = useState(activity.link ?? '');
  const [editNotes, setEditNotes] = useState(activity.notes ?? '');

  const startEditingDetails = () => {
    setEditTitle(activity.title);
    setEditCategory(activity.category);
    setEditDateISO(activity.dateStart ?? '');
    setEditTime(activity.time ?? '');
    setEditLocation(activity.location ?? '');
    setEditLink(activity.link ?? '');
    setEditNotes(activity.notes ?? '');
    setEditingDetails(true);
  };

  const saveDetails = () => {
    if (!editTitle.trim()) return;
    onUpdate({
      title: editTitle.trim(),
      category: editCategory,
      date: editDateISO ? formatDateLabel(editDateISO) : undefined,
      dateStart: editDateISO || undefined,
      dateEnd: editDateISO || undefined,
      time: editTime.trim() || undefined,
      location: editLocation.trim() || undefined,
      link: editLink.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });
    setEditingDetails(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-[460px] overflow-y-auto rounded-3xl bg-[color:var(--color-surface)] pb-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-t-3xl bg-[color:var(--color-brand-light)]">
          {activity.imageDataUrl ? (
            <img src={activity.imageDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[36px] font-bold text-[color:var(--color-ink-soft)]">{c.name.charAt(0)}</span>
          )}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-surface)]/90 text-[14px] font-bold shadow-sm"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
            <CategoryTag category={activity.category} className="bg-[color:var(--color-surface)]" />
            {activity.source && activity.source !== 'manual' && (
              <SourceBadge source={activity.source} className="bg-[color:var(--color-surface)]" />
            )}
          </div>
        </div>

        <div className="px-5 pt-4">
          {editingDetails ? (
            <div className="mb-4 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
                  Title
                </label>
                <input
                  type="text"
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as CategoryId)}
                    className="w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
                    Date (optional)
                  </label>
                  <input
                    type="date"
                    value={editDateISO}
                    onChange={(e) => setEditDateISO(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
                    Time (optional)
                  </label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
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
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Venue or address"
                    className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
                  Link (optional)
                </label>
                <input
                  type="url"
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[color:var(--color-ink-soft)]">
                  Notes (optional)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything you want to remember about this"
                  className="w-full resize-none rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveDetails}
                  disabled={!editTitle.trim()}
                  className="flex-1 rounded-xl bg-[color:var(--color-brand)] px-4 py-2.5 text-[13.5px] font-bold text-[color:var(--color-on-brand)] disabled:opacity-40"
                >
                  Save changes
                </button>
                <button
                  onClick={() => setEditingDetails(false)}
                  className="rounded-xl border border-[color:var(--color-line)] px-4 py-2.5 text-[13.5px] font-semibold text-[color:var(--color-ink-soft)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-1 flex items-start justify-between gap-2">
                <h2 className="text-[19px] font-bold leading-snug">{activity.title}</h2>
                <button
                  onClick={startEditingDetails}
                  className="mt-0.5 shrink-0 text-[11.5px] font-bold text-[color:var(--color-ink-soft)] underline underline-offset-2"
                >
                  Edit
                </button>
              </div>
              {(activity.date || activity.time) && (
                <div className="mb-1 text-[13px] text-[color:var(--color-ink-soft)]">
                  {[activity.date, activity.time].filter(Boolean).join(' · ')}
                </div>
              )}
              {activity.location && (
                <div className="mb-3 text-[13px] text-[color:var(--color-ink-soft)]">{activity.location}</div>
              )}
              {!activity.location && (activity.date || activity.time) && <div className="mb-3" />}

              {!hasPassed && (
                <>
                  {activity.notes && (
                    <p className="mb-4 text-[13.5px] leading-relaxed text-[color:var(--color-ink)]">
                      {activity.notes}
                    </p>
                  )}
                  {!activity.notes && !activity.date && !activity.time && !activity.location && (
                    <p className="mb-4 text-[13px] text-[color:var(--color-ink-soft)]">
                      No extra details added for this one yet.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* Journal — once the date has passed, invite a short reflection instead of
              just showing whatever notes were captured beforehand (a Discover blurb,
              a manual note, or nothing). Reuses the same `notes` field. */}
          {hasPassed && !editingDetails && (
            <div className="mb-4 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] p-3.5">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-ink-soft)]">
                Journal
              </div>
              {editingJournal ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    placeholder="How did it go? Anything you want to remember for next time?"
                    className="w-full resize-none rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-3 py-2.5 text-[13.5px] outline-none focus:border-[color:var(--color-brand-mid)]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveJournal}
                      className="rounded-xl bg-[color:var(--color-brand)] px-3.5 py-2 text-[12.5px] font-bold text-[color:var(--color-on-brand)]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setDraft(activity.notes ?? '');
                        setEditingJournal(false);
                      }}
                      className="rounded-xl border border-[color:var(--color-line)] px-3.5 py-2 text-[12.5px] font-semibold text-[color:var(--color-ink-soft)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : activity.notes ? (
                <div>
                  <p className="mb-2 text-[13.5px] leading-relaxed text-[color:var(--color-ink)]">{activity.notes}</p>
                  <button
                    onClick={() => setEditingJournal(true)}
                    className="text-[12px] font-bold text-[color:var(--color-ink-soft)] underline underline-offset-2"
                  >
                    Edit reflection
                  </button>
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-[13px] text-[color:var(--color-ink-soft)]">
                    This one's already happened — want to jot down how it went?
                  </p>
                  <button
                    onClick={() => setEditingJournal(true)}
                    className="rounded-xl border border-[color:var(--color-ink)] px-3.5 py-2 text-[12.5px] font-bold text-[color:var(--color-ink)]"
                  >
                    Add a reflection
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!editingDetails && (
            <div className="flex gap-2.5">
              <button
                onClick={onRemove}
                className="flex-1 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-[13.5px] font-bold text-[color:var(--color-ink)]"
              >
                Remove from my list
              </button>
              {activity.link ? (
                <a
                  href={activity.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-2xl bg-[color:var(--color-ink)] px-4 py-3 text-center text-[13.5px] font-bold text-[color:var(--color-on-brand)]"
                >
                  Open link ↗
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

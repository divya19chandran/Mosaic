import { useCallback, useEffect, useState } from 'react';
import type { OcrFeedbackEntry } from '../types';

const STORAGE_KEY = 'hobbies.explore.ocrFeedback';

/**
 * Persists person-flagged "this OCR guess was wrong" reports to localStorage
 * — same pattern as useMyActivities. This is on-device only (the app has no
 * backend), so it's paired with an export action (see OcrFeedbackPage) that
 * turns entries into a JSON file the person can send back so they can become
 * real evals/historical-cases.mjs entries or evals/fixtures/ files.
 */
export function useOcrFeedback() {
  const [entries, setEntries] = useState<OcrFeedbackEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as OcrFeedbackEntry[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore write failures (e.g. private browsing storage limits, or a
      // large backlog of unsynced screenshots pushing past quota — export
      // and clear in that case)
    }
  }, [entries]);

  const addEntry = useCallback((input: Omit<OcrFeedbackEntry, 'id' | 'createdAt'>) => {
    const entry: OcrFeedbackEntry = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...input,
    };
    setEntries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => setEntries([]), []);

  return { entries, addEntry, removeEntry, clearAll };
}

import { useCallback, useEffect, useState } from 'react';
import type { Activity, CategoryId, SourceSite } from '../types';

const STORAGE_KEY = 'hobbies.explore.myActivities';

export interface NewActivityInput {
  title: string;
  category: CategoryId;
  link?: string;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  time?: string;
  location?: string;
  notes?: string;
  imageDataUrl?: string;
  source?: SourceSite;
}

/**
 * Persists the person's own added activities to localStorage. This IS the
 * primary content of Explore for milestone 1 — there is no curated
 * marketplace underneath it. When a backend exists, swap the localStorage
 * read/write below for an API call; the hook's return shape can stay the
 * same.
 */
export function useMyActivities() {
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Activity[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    } catch {
      // ignore write failures (e.g. private browsing storage limits)
    }
  }, [activities]);

  const addActivity = useCallback((input: NewActivityInput) => {
    const activity: Activity = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      addedAt: new Date().toISOString(),
      ...input,
    };
    setActivities((prev) => [activity, ...prev]);
    return activity;
  }, []);

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateActivity = useCallback((id: string, patch: Partial<Activity>) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const findActivity = useCallback((id: string) => activities.find((a) => a.id === id), [activities]);

  return { activities, addActivity, removeActivity, updateActivity, findActivity };
}

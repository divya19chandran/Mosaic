import { useCallback, useState } from 'react';

const NAME_KEY = 'hobbies.profile.name';
const JOINED_KEY = 'hobbies.profile.joinedAt';
const DEFAULT_NAME = 'You';

/** First-run only: stamp today as "member since" the first time this hook ever runs. */
function readOrInitJoinedAt(): string {
  try {
    const existing = localStorage.getItem(JOINED_KEY);
    if (existing) return existing;
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(JOINED_KEY, today);
    return today;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Lightweight personal-summary profile — just a display name and a
 * "member since" date, both persisted to localStorage. No social graph, no
 * friends/followers — the rollup stats (activities added, categories tried)
 * are derived from useMyActivities elsewhere and shown alongside this.
 */
export function useProfile() {
  const [name, setName] = useState<string>(() => {
    try {
      return localStorage.getItem(NAME_KEY) || DEFAULT_NAME;
    } catch {
      return DEFAULT_NAME;
    }
  });
  const [joinedAt] = useState<string>(readOrInitJoinedAt);

  const updateName = useCallback((next: string) => {
    const trimmed = next.trim() || DEFAULT_NAME;
    setName(trimmed);
    try {
      localStorage.setItem(NAME_KEY, trimmed);
    } catch {
      // ignore write failures
    }
  }, []);

  return { name, joinedAt, updateName };
}

import { useCallback, useMemo, useRef, useState } from 'react';
import { expandDateRange } from '../lib/calendar';
import {
  fetchGoogleCalendarEvents,
  requestGoogleAccessToken,
  revokeGoogleAccessToken,
  type GoogleCalendarEvent,
} from '../lib/googleCalendar';

export type GoogleCalendarStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || undefined;

/**
 * Read-only Google Calendar overlay, scoped to CalendarView only (per
 * project decision — this is an overlay on the existing month grid, not a
 * standing background sync). The access token is kept in a ref (memory
 * only, never localStorage) so it disappears on refresh/close by design:
 * connecting is always a fresh, explicit Google consent click.
 */
export function useGoogleCalendar() {
  const [status, setStatus] = useState<GoogleCalendarStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const tokenRef = useRef<string | null>(null);
  const lastRangeRef = useRef<{ min: string; max: string } | null>(null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, GoogleCalendarEvent[]>();
    for (const e of events) {
      for (const iso of expandDateRange(e.dateStart, e.dateEnd)) {
        const list = map.get(iso) ?? [];
        list.push(e);
        map.set(iso, list);
      }
    }
    return map;
  }, [events]);

  const loadRange = useCallback(async (timeMinIso: string, timeMaxIso: string) => {
    if (!tokenRef.current) return;
    lastRangeRef.current = { min: timeMinIso, max: timeMaxIso };
    try {
      const fetched = await fetchGoogleCalendarEvents(tokenRef.current, timeMinIso, timeMaxIso);
      setEvents(fetched);
      setStatus('connected');
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not load Google Calendar events.');
      setStatus('error');
    }
  }, []);

  const connect = useCallback(
    async (timeMinIso: string, timeMaxIso: string) => {
      if (!CLIENT_ID) {
        setErrorMessage(
          'Google Calendar isn\u2019t set up yet \u2014 it needs a Client ID from Google Cloud Console (VITE_GOOGLE_CLIENT_ID). Ask in chat and we\u2019ll set it up together.'
        );
        setStatus('error');
        return;
      }
      setStatus('connecting');
      setErrorMessage(null);
      try {
        const token = await requestGoogleAccessToken(CLIENT_ID);
        tokenRef.current = token;
        await loadRange(timeMinIso, timeMaxIso);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Google sign-in failed.');
        setStatus('error');
      }
    },
    [loadRange]
  );

  const disconnect = useCallback(() => {
    if (tokenRef.current) {
      void revokeGoogleAccessToken(tokenRef.current);
    }
    tokenRef.current = null;
    lastRangeRef.current = null;
    setEvents([]);
    setStatus('disconnected');
    setErrorMessage(null);
  }, []);

  /** Called whenever the visible month range changes; no-ops if not connected or the range is unchanged. */
  const refreshRange = useCallback(
    (timeMinIso: string, timeMaxIso: string) => {
      if (status !== 'connected' || !tokenRef.current) return;
      const last = lastRangeRef.current;
      if (last && last.min === timeMinIso && last.max === timeMaxIso) return;
      void loadRange(timeMinIso, timeMaxIso);
    },
    [status, loadRange]
  );

  return {
    status,
    errorMessage,
    eventsByDate,
    isConfigured: Boolean(CLIENT_ID),
    connect,
    disconnect,
    refreshRange,
  };
}

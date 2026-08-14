/**
 * Read-only Google Calendar access for the Calendar view overlay (see
 * useGoogleCalendar.ts and CalendarView.tsx). This is the ONLY place in the
 * app that talks to Google. Deliberately minimal-scope and no npm
 * dependency: Google Identity Services (GIS) is loaded from Google's own CDN
 * at runtime, and events are read straight from the Calendar API v3 REST
 * endpoint via fetch with a Bearer token — no client library, no backend
 * relay (the app has none), matching how the rest of Mosaic stays
 * client-only.
 *
 * The OAuth "ask for permission" step IS Google's own consent screen,
 * triggered only by an explicit user click on "Connect Google Calendar" in
 * CalendarView — this file never requests or silently refreshes a token on
 * its own.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CALENDAR_READONLY_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

/** Loads the GIS script exactly once, no matter how many times this is called. */
export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not running in a browser'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Opens Google's own OAuth consent popup (calendar.readonly scope only) and
 * resolves with a short-lived access token. Must be called from a user
 * gesture (a click handler) — browsers block popups otherwise. The token is
 * never persisted by this module; the caller (useGoogleCalendar) keeps it
 * in memory only.
 */
export function requestGoogleAccessToken(clientId: string): Promise<string> {
  return loadGoogleIdentityScript().then(
    () =>
      new Promise<string>((resolve, reject) => {
        if (!window.google) {
          reject(new Error('Google Identity Services did not load'));
          return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: CALENDAR_READONLY_SCOPE,
          callback: (resp) => {
            if (resp.access_token) resolve(resp.access_token);
            else reject(new Error(resp.error || 'Google sign-in was cancelled or denied'));
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      })
  );
}

/** Best-effort token revocation on disconnect — not required for the token to expire, just tidier. */
export function revokeGoogleAccessToken(token: string): Promise<void> {
  return loadGoogleIdentityScript().then(
    () =>
      new Promise<void>((resolve) => {
        if (!window.google) {
          resolve();
          return;
        }
        window.google.accounts.oauth2.revoke(token, () => resolve());
      })
  );
}

/** Normalized shape CalendarView renders — mirrors Activity's date fields so the two can share bucketing logic. */
export interface GoogleCalendarEvent {
  id: string;
  title: string;
  dateStart: string; // "YYYY-MM-DD"
  dateEnd?: string; // "YYYY-MM-DD", set only for multi-day events
  allDay: boolean;
  time?: string; // formatted time/time-range for timed events, e.g. "5:30 PM – 7:00 PM"
  location?: string;
  htmlLink?: string; // opens the event on calendar.google.com
}

interface RawGoogleEvent {
  id: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function normalizeEvent(raw: RawGoogleEvent): GoogleCalendarEvent | null {
  if (!raw.id || !raw.start) return null;
  const allDay = Boolean(raw.start.date);
  const dateStart = raw.start.date ?? raw.start.dateTime?.slice(0, 10);
  if (!dateStart) return null;

  let dateEnd: string | undefined;
  if (allDay && raw.end?.date && raw.end.date !== raw.start.date) {
    // Google's all-day event.end.date is EXCLUSIVE (the day after the last
    // day) — subtract a day so dateEnd is inclusive, matching Activity's convention.
    const endExclusive = new Date(`${raw.end.date}T00:00:00`);
    endExclusive.setDate(endExclusive.getDate() - 1);
    dateEnd = endExclusive.toISOString().slice(0, 10);
  } else if (!allDay && raw.end?.dateTime) {
    const endDay = raw.end.dateTime.slice(0, 10);
    if (endDay !== dateStart) dateEnd = endDay;
  }

  return {
    id: raw.id,
    title: raw.summary?.trim() || '(untitled event)',
    dateStart,
    dateEnd,
    allDay,
    time: !allDay && raw.start.dateTime ? formatTime(raw.start.dateTime) + (raw.end?.dateTime ? ` – ${formatTime(raw.end.dateTime)}` : '') : undefined,
    location: raw.location,
    htmlLink: raw.htmlLink,
  };
}

/**
 * Fetches events on the user's primary calendar within [timeMinIso, timeMaxIso)
 * (timeMaxIso is exclusive — pass the day AFTER the last day you want included).
 */
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date(`${timeMinIso}T00:00:00`).toISOString(),
    timeMax: new Date(`${timeMaxIso}T00:00:00`).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Google session expired — reconnect to keep seeing your events.');
    throw new Error(`Google Calendar request failed (${res.status})`);
  }
  const data = (await res.json()) as { items?: RawGoogleEvent[] };
  return (data.items ?? [])
    .map(normalizeEvent)
    .filter((e): e is GoogleCalendarEvent => e !== null);
}

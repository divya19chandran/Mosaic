/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Cloud Console OAuth 2.0 Client ID, used for the read-only Google Calendar overlay (see useGoogleCalendar.ts). Public value — safe to expose client-side. See .env.example. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

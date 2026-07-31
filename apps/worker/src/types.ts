import type { AppSettings, ReleaseTrack } from "@ragectrl/shared";
export interface Env { APP_KV: KVNamespace; SPOTIFY_CLIENT_ID: string; SPOTIFY_REDIRECT_URI: string; FRONTEND_URL: string; SPOTIFY_PLAYLIST_ID: string; OAUTH_STATE_SECRET: string; RELEASE_LOOKBACK_DAYS?: string }
export type TokenRecord = { accessToken: string; refreshToken: string; expiresAt: number };
export type StoredState = { verifier: string; createdAt: number };
export type StoredData = { pending?: ReleaseTrack[]; lastScanAt?: string; settings?: AppSettings };
export type JsonObject = Record<string, unknown>;

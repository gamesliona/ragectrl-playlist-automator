# RageCTRL Playlist Automator

A private release-review dashboard for discovering new Spotify tracks by an explicit artist watchlist, approving or rejecting them once, and adding approved tracks to a managed playlist. The visual system uses RageCTRL black, sharp borders, and action-only green.

## Architecture

- **React + Vite + TypeScript** is a static GitHub Pages frontend. It never receives Spotify tokens.
- **Cloudflare Worker** owns Spotify Authorization Code with PKCE, Spotify requests, validation, and CORS.
- **Cloudflare KV** stores the refresh/access token record, one-time OAuth state/verifiers, pending releases, settings, scan timestamp, and per-track review status.
- **Shared package** contains API and domain types. Spotify, persistence, route, scanning, and playlist logic remain separated so audio/BPM metadata can be introduced later without changing route contracts.

## Requirements

- Node.js 22+, npm 10+
- Spotify developer application and account with access to the target playlist
- Cloudflare account, Wrangler authentication, and a KV namespace

## Configure Spotify

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add the exact redirect URI used by the Worker, locally `http://localhost:8787/api/auth/callback` and in production `https://<worker>.<subdomain>.workers.dev/api/auth/callback`. Spotify must list each exact URI.
3. Copy the Client ID. This PKCE implementation does **not** use a client secret.
4. The login requests `playlist-read-private`, `playlist-modify-private`, and `playlist-modify-public`. The two modify scopes support either target playlist visibility; the read scope is used for duplicate prevention.
5. During Spotify development mode, add the Spotify account that will connect under **User Management**.

## Environment variables

| Name | Purpose |
|---|---|
| `SPOTIFY_CLIENT_ID` | Spotify app Client ID |
| `SPOTIFY_REDIRECT_URI` | Exact Worker OAuth callback URL |
| `FRONTEND_URL` | Exact allowed frontend origin and post-login destination (no trailing slash) |
| `SPOTIFY_PLAYLIST_ID` | Target playlist ID from its Spotify URL |
| `OAUTH_STATE_SECRET` | Long random key for signed OAuth state; store as a Worker secret |
| `RELEASE_LOOKBACK_DAYS` | Optional scan window, defaults to `30` |
| `VITE_API_URL` | Public Worker origin used only by the frontend |
| `VITE_BASE_PATH` | Optional Vite Pages base override. The deployment workflow defaults to `/<repository-name>/`; use `/` for a user site or custom domain |

Copy `.env.example` for reference. Vite values go in `apps/web/.env.local`. Worker local values go in the gitignored `apps/worker/.dev.vars`; do not create or commit a root `.env`.

## Watchlist

Edit `config/watchlist.json`. Use the immutable Spotify artist ID from an artist URL, never a name search. Add entries under `artists`; set `enabled` to `false` to pause an artist or remove the object to delete it. `priority` is reserved for later scan prioritization. The placeholder is disabled and should be replaced. Deploy the Worker again after editing this file.

```json
{"artists":[{"id":"0OdUWJ0sBjDrqHygGUXeCF","name":"Example","enabled":true,"priority":10}]}
```

## Local development

```bash
npm install
cp .env.example apps/worker/.dev.vars
# Edit apps/worker/.dev.vars; create apps/web/.env.local with VITE_API_URL and VITE_BASE_PATH.
npm run dev:worker
# In a second terminal:
npm run dev:web
```

Open `http://localhost:5173`. To verify production output:

```bash
npm test
npm run typecheck
npm run build
```

The checked-in mock data makes the dashboard legible before connection; after the initial status requests, real API state replaces it. An unreachable local Worker produces a visible API error while retaining the preview.

## Cloudflare setup and deployment

```bash
npx wrangler login
npx wrangler kv namespace create APP_KV
npx wrangler kv namespace create APP_KV --preview
# Put returned IDs in apps/worker/wrangler.toml.
cd apps/worker
npx wrangler secret put OAUTH_STATE_SECRET
npx wrangler deploy --var SPOTIFY_CLIENT_ID:YOUR_ID --var SPOTIFY_REDIRECT_URI:https://YOUR_WORKER.workers.dev/api/auth/callback --var FRONTEND_URL:https://YOUR_USER.github.io --var SPOTIFY_PLAYLIST_ID:YOUR_PLAYLIST
```

Cloudflare Dashboard environment variables are an alternative and are recommended for stable production configuration. Although the Spotify Client ID is public by definition, keep all Worker configuration out of frontend source. KV is eventually consistent; this is appropriate for a single-user dashboard but D1 would be preferable for multi-user transactions.

## GitHub Pages deployment

1. Push the repository to GitHub and choose **Settings → Pages → Source → GitHub Actions**.
2. Under **Settings → Secrets and variables → Actions → Variables**, set `VITE_API_URL` to the Worker origin. Project sites automatically use `/<repository-name>/`; set `VITE_BASE_PATH` only to override that default (for example, `/` for a user site/custom domain).
3. Set the Worker's `FRONTEND_URL` to the Pages **origin** (`https://user.github.io`, without the repository path), and add the production Worker callback to Spotify.
4. Push `main` or manually run **Deploy GitHub Pages**. The workflow installs, tests, builds, uploads, and deploys the Vite artifact.

## API

The Worker exposes `GET /api/auth/login`, `GET /api/auth/callback`, `POST /api/auth/logout`, `GET /api/status`, `GET /api/releases/pending`, `POST /api/releases/scan`, `POST /api/releases/reject`, `POST /api/playlist/add`, `GET /api/settings`, and `PUT /api/settings`. JSON endpoints consistently return `{ success, data }` or `{ success, error: { code, message } }`. Mutations enforce origin and validate IDs, counts, settings, and ordering modes.

Scanning reads enabled IDs, requests albums/singles and album tracks, deduplicates Spotify track IDs, applies the lookback and optional primary-artist filter, excludes persisted decisions, sorts newest first, and saves pending state. Spotify 429 and temporary 5xx responses receive bounded exponential retries. Playlist insertion reads existing IDs, skips duplicates, orders missing known pending tracks, adds in Spotify-sized batches, and approves only successful batches.

## Common errors

- **INVALID_STATE**: restart login; the signed one-time OAuth state expires after ten minutes. Also verify the KV binding and state secret.
- **Spotify redirect mismatch**: make `SPOTIFY_REDIRECT_URI` byte-for-byte identical to the dashboard entry (including protocol and path).
- **Origin is not allowed**: `FRONTEND_URL` must be the browser origin, without a path or trailing slash.
- **Spotify 403**: ensure the connected account owns/can modify the playlist, is allowed in app development mode, and granted the requested playlist scopes.
- **No releases**: replace the disabled placeholder IDs, redeploy the Worker, confirm dates fall within the lookback, and check prior approved/rejected state.

## Security and limitations

Tokens stay in KV and are never returned to the browser or logged. OAuth uses PKCE plus HMAC-signed, single-use, expiring state. CORS is restricted to one configured frontend. Inputs are allowlisted and internal exceptions are hidden.

Version one is intentionally single-user and has a file-based watchlist. KV does not provide strong transactions, scheduled scanning is not enabled, Spotify pagination is bounded to protect Worker execution time, and ordering applies to the newly inserted batch rather than rewriting the full existing playlist. “Keep current order” appends new tracks in selected/pending order. Random ordering is intentionally non-repeatable. BPM retrieval, audio analysis, and BPM sorting are explicitly not implemented; the isolated ordering module is the extension point.

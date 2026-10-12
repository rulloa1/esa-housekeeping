# ESA Housekeeping

Next.js app for the Extended Stay America housekeeping board.

- `/login` sign in as Housekeeping or Front desk with a PIN
- `/housekeeping` the board, shared live between every signed-in screen

## How live updates work

The board (`board/housekeeping.html`) reads and writes suites through `window.claude.use("db")`, the same interface it uses as a Claude artifact. `app/housekeeping/route.ts` serves the board with `public/hk-db.js` injected, which implements that interface against the app's API:

- `GET /api/suites?since=<version>` returns `{ version, docs }`, or `{ version, unchanged: true }` if nothing changed
- `PATCH /api/suites/:id` with `{ base, next }` saves the board's changes to one suite (101–332): `base` is the copy the board was editing from, so the server applies only what the board changed and keeps changes others saved meanwhile (guest requests, other iPads, the operations dashboard). The server sets `updatedBy` from the signed-in role and enforces the role rules (only supervisors pass inspections, record welfare checks or clear a suite)
- `PUT /api/suites/:id` runs a dashboard action (`{ action: "start_cleaning", … }`) or applies a partial update
- `DELETE /api/suites/:id` clears a suite (supervisors only)

Every save to a suite runs under a short per-suite lock, so two saves landing together can't overwrite each other. If the board can't reach the server, `hk-db.js` keeps the save queued (also across a reload), keeps showing it, shows "Not saved yet · Retrying…" and sends it once the connection is back.

Every open board polls every 3 seconds (15 seconds while the tab is hidden), so a change made by housekeeping shows up for the front desk within a few seconds. Data lives in Redis.

## Deploy on Vercel

1. Import this repo into Vercel.
2. In the project's Storage tab, add a Redis database (free tier). The app uses `REDIS_URL` if it is set, otherwise Upstash's `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Add `AUTH_SECRET`, `HOUSEKEEPING_PIN`, `FRONTDESK_PIN` (Supervisor) and `ADMIN_PIN` under Environment Variables, then redeploy. Optionally add `CRON_SECRET` so only Vercel Cron can trigger the daily backup.

Sign-in allows 10 wrong PINs per device address in 15 minutes, then waits out the rest of the 15 minutes.

## Backups

`vercel.json` runs `/api/cron/snapshot` daily at 10:00 UTC (5 AM Houston in summer). It copies every suite to the Redis key `hk:snapshot:<YYYY-MM-DD>` and keeps each copy 30 days. To restore a day, read that key, and for each entry in its `docs` run `HSET hk:suites <suite> <JSON>`, then `INCR hk:version` so open boards reload.

An empty store stays empty in production. The demo rooms in `lib/store.ts` only fill an empty store in local development, or when `HK_SEED_DEMO=1` is set.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000/housekeeping. Without Redis settings, data is kept in memory until the server restarts, the Housekeeper and Supervisor PINs are `1234` and the Administrator PIN is `9999`. These defaults never apply in production: there, a role can only sign in once its PIN variable (`HOUSEKEEPING_PIN`, `FRONTDESK_PIN` for Supervisor, `ADMIN_PIN`) is set.

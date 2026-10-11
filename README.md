# ESA Housekeeping

Next.js app for the Extended Stay America housekeeping board.

- `/login` sign in as Housekeeping or Front desk with a PIN
- `/housekeeping` the board, shared live between every signed-in screen

## How live updates work

The board (`board/housekeeping.html`) reads and writes suites through `window.claude.use("db")`, the same interface it uses as a Claude artifact. `app/housekeeping/route.ts` serves the board with `public/hk-db.js` injected, which implements that interface against the app's API:

- `GET /api/suites?since=<version>` returns `{ version, docs }`, or `{ version, unchanged: true }` if nothing changed
- `PUT /api/suites/:id` saves one suite's document (101–332); the server adds `updatedBy`
- `DELETE /api/suites/:id` clears a suite

Every open board polls every 3 seconds (15 seconds while the tab is hidden), so a change made by housekeeping shows up for the front desk within a few seconds. Data lives in Upstash Redis.

## Deploy on Vercel

1. Import this repo into Vercel.
2. In the project's Storage tab, add Upstash Redis (free tier). It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Add `AUTH_SECRET`, `HOUSEKEEPING_PIN` and `FRONTDESK_PIN` under Environment Variables, then redeploy.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000/housekeeping. Without Redis settings, data is kept in memory until the server restarts, and both PINs are `1234`.

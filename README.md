# ESA Housekeeping

Next.js app for the Extended Stay America housekeeping board.

- `/` home page with a link to the board
- `/housekeeping` serves `public/housekeeping.html` (via a rewrite in `next.config.ts`)

The board is a standalone page. It saves its state in each browser's local storage, so changes are not shared between devices.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000/housekeeping.

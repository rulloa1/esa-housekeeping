# Extended Stay America Suites — Housekeeping Operations Platform
### Property: Houston IAH Airport (96 Suites across Floors 1–3)

A hospitality operations and housekeeping management platform for Extended Stay America Suites — Houston IAH Airport, built with Next.js 16, TypeScript, React 19, and Tailwind-free vanilla CSS design tokens.

---

## Key Interfaces & Routes

- **`/`**: Public landing page for hotel visitors and guests (`board/landing.html`); signed-in staff are automatically redirected to their respective work station.
- **`/staff`**: Staff Operations launchpad with bilingual language switcher (`EN` / `ES`) and role-based links.
- **`/dashboard`**: **Supervisor Operations Dashboard**
  - **Live KPI Summary**: 8 metrics cards (Total, Dirty, Assigned, Cleaning, Awaiting Inspection, Clean & Ready, Maintenance, Overdue / Urgent).
  - **Operations Table & Room Cards**: Sortable and filterable table with real-time status badges, attendant names, and service types.
  - **Batch Suite Assignment**: Select multiple rooms across floors and assign attendant and priority in a single atomic action.
  - **Staff Workload Distribution**: Real-time breakdown by attendant, cleaning duration estimations by room type and service type, and automated workload imbalance warning alerts.
  - **QA Room Inspection Modal**: 7-category quality assurance checklist with pass/fail workflows and defect tagging.
  - **Maintenance Logging Modal**: Engineering ticket creation with categories, priorities, and out-of-service toggling.
  - **Operations & QA Analytics Report**: Real-time cleaning duration averages, first-time inspection pass rates, attendant productivity, and printable shift reports.
  - **Real-Time Operational Alerts**: Live activity feed aggregating cleaning completions, QA rejections, maintenance tickets, and guest requests across all 96 suites.
- **`/housekeeper`**: **Mobile Housekeeper Attendant Workspace**
  - Touch-optimized interface for smartphones and tablets.
  - Category-based 21-item cleaning checklists (Bedroom, Bathroom, Kitchenette, Final Check) with auto-save and mandatory item validation.
  - Attendant touch controls: Start Cleaning, Submit for Inspection, Report Maintenance, and Request Supplies.
- **`/roster`** (administrators): **Staff roster with personal PINs**. Add a person with a name, role and their own 4–8 digit PIN; change a PIN, change a role, or switch someone off. Nobody is deleted, so history keeps their name. The shared role PINs keep working alongside.
- **`/reports`** (supervisors and admins): **Shift report** for any of the last 14 hotel days: suites cleaned and average clean time, inspections and first-time pass rate, guest requests with median response time, maintenance and supplies, a by-person table and each suite's activity. Print it, or download it as CSV (`GET /api/reports?date=YYYY-MM-DD`). Worked out from suite history (latest 50 entries per suite), so older days may be incomplete.
- **Departures & Arrivals** (dashboard button, supervisors): paste today's departure and arrival suite numbers from the property system, check what will change, then apply. Departures become checkouts needing a turnover (a clean suite goes back to needing cleaning); arrivals get high priority (urgent for a same-day turn) and are flagged on the Overdue panel if not ready by 3 PM. Every suite is snapshotted first.
- **Housekeeper alerts**: the housekeeper page shows a banner, vibrates and chimes when a suite is assigned to that person, a guest in one of their suites makes a request, or one of their suites fails inspection.
- **Lock-screen notifications**: "Turn on notifications" on the housekeeper page (and the dashboard) signs that phone or iPad up. Housekeepers get a notification when a suite is assigned to them, one of their suites fails inspection, or a guest in one of their suites asks for cleaning, towels or amenities; supervisors get guest requests for unassigned suites. On iPhone and iPad this works only after **Share → Add to Home Screen** and opening the app from there (the page shows that hint). Needs `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (e.g. `mailto:you@example.com`); generate the keys with `npx web-push generate-vapid-keys`. Without them the button doesn't appear. Devices are stored in the Redis hash `hk:push`.
- **New-day reset**: the daily cron (10:00 UTC), right after saving the day's snapshot, turns cleaned checkouts into vacant suites, clears yesterday's arrivals list, and returns ready suites' raised priority to standard. Each change is logged as "New Day". It never touches a suite that still needs work or the 3D board's own daily fields. Set `HK_ROLLOVER=0` to switch it off.
- **`/my-rooms`**: short link to `/housekeeper`. A housekeeper who signed in with their own PIN sees only their own suites there, and their name goes on everything they do.
- **`/housekeeping`**: **3D Building Board (v21)**
  - Interactive 3D building layout with real-time suite state synchronization and top navigation banner.
- **`/guest-links`**: **Printable Guest QR Cards**
  - Printable sheet of QR cards (one per suite) with HMAC-signed keys for guest room placement.
- **`/guest/[suite]?k=<key>`**: **Guest Self-Service Portal**
  - Mobile guest interface (bilingual EN/ES) allowing guests to request service, fresh towels, amenities refills, or toggle Do Not Disturb without logging in.
  - Protected with HMAC-signed keys and a 2-minute rate-limiting debounce.

### Core API Routes & Actions
- `GET /api/suites?since=<version>` returns `{ version, docs }`, or `{ version, unchanged: true }` if nothing changed.
- `POST /api/suites` batch-assigns suites (`action: "batch_assign"`, `suiteIds`, `attendant`, `priority`).
- `PATCH /api/suites/:id` saves optimistic diff changes (`base`, `next`) with role security enforcement.
- `PUT /api/suites/:id` runs workflow actions:
  - `start_cleaning`: begins room turnover.
  - `complete_cleaning`: submits room for inspection (`awaiting_inspection`).
  - `inspect_pass` & `inspect_fail`: QA approval/rejection (enforces 403 on self-approval).
  - `assign`: assigns attendant and priority.
  - `report_maintenance`: logs issue and sets suite to `maintenance`.
  - `resolve_maintenance`: resolves issue (`issueId`), returns suite to `dirty` when all issues cleared.
  - `request_supplies`: logs supply requisition.
  - `fulfill_supplies`: marks supply requisition completed (`requestId`).
  - `guest_request_done`: marks cleaning, towels, or amenity guest requests completed (`requestAt`).
- `POST /api/guest/:suite` processes guest requests with 2-minute debounce and 10 req/hr rate limiting. Refuses requests (409) if suite is Vacant or Checkout.
- `DELETE /api/suites/:id` clears a suite (supervisors only).
- `GET /api/staff` lists the roster (supervisors see everything but PINs; housekeepers get active housekeepers' names). `POST /api/staff { name, role, pin }` and `PATCH /api/staff/:id { name?, role?, active?, pin? }` are admin only.
- `POST /api/suites { action: "front_desk_list", departures, arrivals, apply }` (supervisors): `apply: false` previews `plan`; `apply: true` snapshots to `hk:snapshot:before-front-desk-list-<time>` first, then saves and logs "Front Desk List" on each suite.
- `POST /api/suites { action: "reset_baseline" }` first copies every suite to `hk:snapshot:before-reset-<time>` (kept 30 days) and returns that name as `savedAs`.

### Staff roster and personal PINs
- Sign-in tries the shared PIN for the chosen role first, then the roster. A personal PIN signs that person in with their roster role, whatever role was picked.
- Stored in two new Redis hashes: `hk:staff` (id → name, role, active) and `hk:staff:pin` (HMAC of the PIN with `AUTH_SECRET` → id). PINs themselves are never stored. Changing `AUTH_SECRET` invalidates every personal PIN, so re-issue them if you rotate it.
- A personal session is checked against the roster on every request: switching someone off or changing their role takes effect at once.
- With a personal sign-in, history uses the person's roster name (a name sent by the page is ignored), and a housekeeper can only start or submit suites assigned to them or unassigned (`403 { reason: "notYours" }`). Shared-PIN sign-ins behave as before.
- Assignment lists use the roster's active housekeepers once there is at least one; until then they show the sample names.
- **Rollback:** revert the PR. Personal sessions stop working (people sign in with the shared PINs again); the `hk:staff*` keys are left unused and can be deleted later.

### Overdue flags (supervisor dashboard)
Read-only, worked out from what each suite already holds (`lib/overdue.ts`); nothing is written:
- a towel, cleaning or amenity guest request open 30 minutes or more;
- a checkout suite, or one on today's arrivals list, not clean, awaiting inspection or inspected after 3 PM hotel time (check-in);
- a suite cleaned and waiting 30 minutes or more for inspection;
- a suite in progress for 60 minutes or more;
- a maintenance issue open 24 hours or more.

### Photos (maintenance tickets, failed inspections, lost & found)
- "Add photo" opens the camera on phones and iPads. The photo is shrunk on the device (longest side 1280 px, JPEG) before upload, so it is usually 50 to 150 KB.
- `POST /api/photos` (any signed-in staff) checks the file's actual bytes (JPEG, PNG or WebP only; no SVG), caps it at 400 KB, and limits uploads to 40 per person per hour and 300 per day for the hotel.
- Each photo is stored under its own Redis key `hk:photo:<id>` that **expires after 90 days**. `GET /api/photos/<id>` serves it to signed-in staff only. Records keep just the path; links to anything outside the app are dropped.
- **Rollback:** revert the PR. Records keep a `photoUrl` field that is simply not shown; the `hk:photo:*` keys expire on their own.

### Lost & found (`/lost-found`)
- Anyone signed in logs an item: what it is, where it was found (a suite or a public area), where it is kept, a "valuable" flag and an optional photo.
- Supervisors (and admins) mark items **Returned** or **Disposed**, with a short note, or reopen them. The API enforces this (`403 { reason: "supervisorOnly" }`). Nothing is deleted.
- Items held 90 days or more are flagged so the manager can decide what to do with them.
- Don't record guest names, phone numbers or addresses in the log; those stay in the hotel's own system.
- Stored in one new Redis hash, `hk:lostfound`. **Rollback:** revert the PR; the hash is left unused.

### Automatic checks
`.github/workflows/checks.yml` runs the type check, unit tests and a production build on every pull request and every push to `main`. A red check means Vercel would reject the same build.

### Undoing a reset
Copy the snapshot's `docs` back into the `hk:suites` hash and bump `hk:version`, for example with `redis-cli GET "hk:snapshot:before-reset-…"`, then `HSET hk:suites <id> <json>` for each suite and `INCR hk:version`.

---

## Operational Architecture & Business Logic

1. **Strict Operational Workflow**:
   - Housekeepers cannot mark rooms `clean` directly. Completing a cleaning checklist transitions the room to `awaiting_inspection`.
   - **No Self-Approval Gate**: Backend enforces HTTP `403 Forbidden` if a housekeeper attempts to inspect or self-approve their own suite.
   - Only supervisors and administrators can approve or reject inspections.
2. **Real Operational Data**:
   - All metrics, durations, and pass rates are dynamically calculated from the 96 suites in real-time.
3. **Audit History & Traceability**:
   - Every operational event (assignment, cleaning started, checklist completed, inspection passed/failed, maintenance ticket logged, supply requested, guest request logged) records an immutable entry in the suite's history timeline.
4. **Data Persistence**:
   - Supports Redis TCP (`REDIS_URL`), Upstash REST (`KV_REST_API_URL` and `KV_REST_API_TOKEN`), with an in-memory fallback for local development.

---

## Automated Test Suite

An end-to-end integration test suite is located in `scripts/test-workflow.mjs`.

To run the automated test suite:
```bash
# 1. Start the application
npm run build
npm run start -p 3333

# 2. In another terminal, run the test suite
npm run test:workflow # or: node scripts/test-workflow.mjs
```

The test suite validates 20 operational scenarios:
1. Supervisor login with HMAC session cookie.
2. Housekeeper login with HMAC session cookie.
3. Inventory verification for all 96 suites (101–132, 201–232, 301–332).
4. Individual suite assignment with priority setting.
5. Cleaning start state transition (`in_progress`).
6. Checklist completion transition (`awaiting_inspection`).
7. **Security Check**: Self-approval blocked with HTTP 403 Forbidden.
8. QA inspection deficiency flagging (`inspection_failed`).
9. Housekeeper deficiency correction and re-submission.
10. Supervisor QA re-inspection and approval to `clean`.
11. Engineering maintenance ticket logging.
12. Supply requisitioning.
13. Chronological audit history verification.
14. Printable guest QR cards link resolution.
15. Guest portal direct access without login.
16. Guest request submission (`towels`).
17. Room state synchronization with guest request note.
18. Guest request 2-minute debounce rate limiting.
19. Multi-suite batch assignment via `POST /api/suites`.
20. Batch persistence and audit trail verification in store.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application:
- Default development PINs:
  - Housekeeper: `1234`
  - Supervisor: `1234`
  - Administrator: `9999`


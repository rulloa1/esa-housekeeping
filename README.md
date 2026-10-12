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


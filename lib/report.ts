// Extended Stay America Suites — Houston IAH Airport
// Shift report for one hotel day, worked out from each suite's history and guest requests.
// Read-only. Each suite keeps its last 50 history entries, so busy suites cover about the last
// week; older days show what is still in history.
import { isGuestTask, type RoomDoc } from "./models";

const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" });

// The hotel day (America/Chicago) an ISO timestamp falls on, as YYYY-MM-DD.
export function hotelDay(iso: string | null | undefined): string | null {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? DAY_FMT.format(new Date(t)) : null;
}

// The last `n` hotel days, newest first, ending with `today`.
export function lastDays(today: string, n: number): string[] {
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
}

const GENERIC = new Set(["Housekeeper", "Supervisor", "System", "Guest", ""]);

export interface PersonRow {
  name: string;
  cleaned: number;
  avgMinutes: number | null;
  passed: number;
  failed: number;
}

export interface DayReport {
  day: string;
  cleaned: number;
  avgCleanMinutes: number | null;
  inspectionsPassed: number;
  inspectionsFailed: number;
  firstTimePassRate: number | null; // % of suites whose first inspection that day passed
  guestRequests: number;
  guestDone: number;
  guestOpen: number;
  guestMedianMinutes: number | null; // request to done
  maintenanceReported: number;
  maintenanceResolved: number;
  suppliesRequested: number;
  people: PersonRow[];
  suites: { suite: string; events: { time: string; event: string; by: string; details: string }[] }[];
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
};
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

const isClean = (e: { event: string; details: string }) =>
  e.event === "Cleaning Completed" || (e.event === "Status Changed" && /to clean$/.test(e.details));
const isStart = (e: { event: string; details: string }) =>
  e.event === "Cleaning Started" || (e.event === "Status Changed" && /to in_progress$/.test(e.details));

export function buildReport(rooms: RoomDoc[], day: string): DayReport {
  const people = new Map<string, { cleaned: number; minutes: number[]; passed: number; failed: number }>();
  const person = (name: string) => {
    if (!people.has(name)) people.set(name, { cleaned: 0, minutes: [], passed: 0, failed: 0 });
    return people.get(name)!;
  };

  const r: DayReport = {
    day, cleaned: 0, avgCleanMinutes: null, inspectionsPassed: 0, inspectionsFailed: 0, firstTimePassRate: null,
    guestRequests: 0, guestDone: 0, guestOpen: 0, guestMedianMinutes: null,
    maintenanceReported: 0, maintenanceResolved: 0, suppliesRequested: 0, people: [], suites: [],
  };
  const cleanMinutes: number[] = [];
  const responseMinutes: number[] = [];
  let firstInspections = 0;
  let firstPassed = 0;

  for (const room of rooms) {
    // Oldest first, so a start can be paired with the clean that follows it.
    // "System Baseline" entries come from the demo seed, not from anyone's work.
    const events = (room.history ?? []).filter((e) => e.event !== "System Baseline" && hotelDay(e.timestamp) === day).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let startedAt: number | null = null;
    let inspectedYet = false;
    for (const e of events) {
      // Shared-PIN saves are logged as "Housekeeper"; credit the suite's attendant then.
      const who = GENERIC.has(e.by) ? room.attendant || e.by || "Unknown" : e.by;
      if (isStart(e)) startedAt = Date.parse(e.timestamp);
      else if (isClean(e)) {
        r.cleaned++;
        const p = person(who);
        p.cleaned++;
        if (startedAt !== null) {
          const m = Math.round((Date.parse(e.timestamp) - startedAt) / 60000);
          if (m > 0 && m < 8 * 60) { cleanMinutes.push(m); p.minutes.push(m); }
          startedAt = null;
        }
      } else if (e.event === "Inspection Passed" || e.event === "Inspection Failed") {
        const pass = e.event === "Inspection Passed";
        pass ? r.inspectionsPassed++ : r.inspectionsFailed++;
        // Credit the result to whoever cleaned the suite, not the inspector.
        const cleaner = room.attendant || "Unassigned";
        pass ? person(cleaner).passed++ : person(cleaner).failed++;
        if (!inspectedYet) { firstInspections++; if (pass) firstPassed++; inspectedYet = true; }
      } else if (e.event === "Maintenance Reported") r.maintenanceReported++;
      else if (e.event === "Maintenance Resolved") r.maintenanceResolved++;
      else if (e.event === "Supply Request") r.suppliesRequested++;
    }
    if (events.length) {
      r.suites.push({ suite: room.id, events: events.map((e) => ({ time: e.timestamp, event: e.event, by: e.by, details: e.details })) });
    }

    for (const g of room.guestRequests ?? []) {
      if (!isGuestTask(g.type) || hotelDay(g.at) !== day) continue;
      r.guestRequests++;
      if (g.doneAt) {
        r.guestDone++;
        const m = Math.round((Date.parse(g.doneAt) - Date.parse(g.at)) / 60000);
        if (m >= 0) responseMinutes.push(m);
      } else r.guestOpen++;
    }
  }

  r.avgCleanMinutes = avg(cleanMinutes);
  r.guestMedianMinutes = median(responseMinutes);
  r.firstTimePassRate = firstInspections ? Math.round((firstPassed / firstInspections) * 100) : null;
  r.people = [...people.entries()]
    .map(([name, p]) => ({ name, cleaned: p.cleaned, avgMinutes: avg(p.minutes), passed: p.passed, failed: p.failed }))
    .sort((a, b) => b.cleaned - a.cleaned || a.name.localeCompare(b.name));
  r.suites.sort((a, b) => a.suite.localeCompare(b.suite));
  return r;
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote everything; neutralise spreadsheet formulas in names and notes.
  return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

export function reportCsv(r: DayReport): string {
  const rows: unknown[][] = [
    ["Report day", r.day],
    ["Suites cleaned", r.cleaned],
    ["Average clean (min)", r.avgCleanMinutes],
    ["Inspections passed", r.inspectionsPassed],
    ["Inspections failed", r.inspectionsFailed],
    ["First-time pass rate (%)", r.firstTimePassRate],
    ["Guest requests", r.guestRequests],
    ["Guest requests done", r.guestDone],
    ["Guest requests still open", r.guestOpen],
    ["Median guest response (min)", r.guestMedianMinutes],
    ["Maintenance reported", r.maintenanceReported],
    ["Maintenance resolved", r.maintenanceResolved],
    ["Supply requests", r.suppliesRequested],
    [],
    ["Person", "Suites cleaned", "Average clean (min)", "Inspections passed", "Inspections failed"],
    ...r.people.map((p) => [p.name, p.cleaned, p.avgMinutes, p.passed, p.failed]),
    [],
    ["Suite", "Time", "Event", "By", "Details"],
    ...r.suites.flatMap((s) => s.events.map((e) => [s.suite, e.time, e.event, e.by, e.details])),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

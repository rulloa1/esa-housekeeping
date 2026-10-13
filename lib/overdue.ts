// Extended Stay America Suites — Houston IAH Airport
// Overdue flags: work that has waited too long. Computed from what's already saved on each suite,
// so nothing is written and nothing changes on the board. Shown on the supervisor dashboard.
import { isGuestTask, type RoomDoc } from "./models";

export const LIMITS = {
  guestRequestMin: 30, // a towel / cleaning / amenity request not marked done
  cleaningMin: 60, // a suite in progress this long
  inspectionWaitMin: 30, // cleaned and waiting for a supervisor
  maintenanceHours: 24, // an open maintenance issue
  checkInHour: 15, // checkouts should be clean by 3 PM hotel time
};

export type OverdueKind = "guest" | "checkin" | "inspection" | "cleaning" | "maintenance";

export interface OverdueFlag {
  suite: string;
  kind: OverdueKind;
  minutes: number; // how long it has waited (for check-in: minutes past 3 PM)
  attendant: string | null;
}

// Most urgent first: a waiting guest, then an arriving guest, then the internal queues.
const ORDER: OverdueKind[] = ["guest", "checkin", "inspection", "cleaning", "maintenance"];

const minutesSince = (iso: string | null | undefined, now: number) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? Math.floor((now - t) / 60000) : -1;
};

// Minutes since midnight in the hotel's time zone.
export function hotelMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

const NOT_READY = new Set(["dirty", "assigned", "in_progress", "inspection_failed"]);

export function overdueFor(room: RoomDoc & { occ?: string; arrivalDate?: string | null }, now: Date): OverdueFlag[] {
  const t = now.getTime();
  const flags: OverdueFlag[] = [];
  const add = (kind: OverdueKind, minutes: number) => flags.push({ suite: room.id, kind, minutes, attendant: room.attendant ?? null });

  const oldestRequest = (room.guestRequests ?? [])
    .filter((r) => isGuestTask(r.type) && !r.doneAt)
    .map((r) => minutesSince(r.at, t))
    .reduce((a, b) => Math.max(a, b), -1);
  if (oldestRequest >= LIMITS.guestRequestMin) add("guest", oldestRequest);

  // Checkouts, and suites on today's arrivals list (lib/frontDesk.ts), must be ready for check-in.
  const isCheckout = room.occ === "checkout" || (room.occ === undefined && room.serviceType === "turnover");
  const arriving = Boolean(room.arrivalDate) && room.arrivalDate === new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(now);
  const pastCheckIn = hotelMinutes(now) - LIMITS.checkInHour * 60;
  if ((isCheckout || arriving) && pastCheckIn >= 0 && NOT_READY.has(room.status)) add("checkin", pastCheckIn);

  if (room.status === "awaiting_inspection") {
    const m = minutesSince(room.completedAt, t);
    if (m >= LIMITS.inspectionWaitMin) add("inspection", m);
  }

  if (room.status === "in_progress") {
    const m = minutesSince(room.startedAt, t);
    if (m >= LIMITS.cleaningMin) add("cleaning", m);
  }

  const oldestIssue = (room.maintenanceIssues ?? [])
    .filter((i) => i.status !== "resolved")
    .map((i) => minutesSince(i.reportedAt, t))
    .reduce((a, b) => Math.max(a, b), -1);
  if (oldestIssue >= LIMITS.maintenanceHours * 60) add("maintenance", oldestIssue);

  return flags;
}

export function overdueAll(rooms: RoomDoc[], now: Date): OverdueFlag[] {
  return rooms
    .flatMap((r) => overdueFor(r, now))
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || b.minutes - a.minutes);
}

export function waited(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 48) return `${h} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim();
  return `${Math.floor(h / 24)} days`;
}

export function describe(flag: OverdueFlag): string {
  switch (flag.kind) {
    case "guest":
      return `Guest request waiting ${waited(flag.minutes)}`;
    case "checkin":
      return flag.minutes === 0 ? "Not ready at 3 PM check-in" : `Not ready, ${waited(flag.minutes)} past 3 PM check-in`;
    case "inspection":
      return `Cleaned, waiting ${waited(flag.minutes)} for inspection`;
    case "cleaning":
      return `In progress for ${waited(flag.minutes)}`;
    case "maintenance":
      return `Maintenance open ${waited(flag.minutes)}`;
  }
}

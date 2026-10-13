// Extended Stay America Suites — Houston IAH Airport
// Today's departures and arrivals, pasted from the property system's reports (any list of suite
// numbers works: one per line, commas, spaces). Marks departures as checkouts needing a turnover,
// and raises arrivals' priority so they're cleaned before 3 PM check-in.
import type { RoomDoc } from "./models";

const SUITE = /^[1-3](0[1-9]|[12]\d|3[0-2])$/;

export function parseSuiteList(text: unknown): { suites: string[]; invalid: string[] } {
  const tokens = typeof text === "string" ? text.split(/[^0-9A-Za-z]+/).filter(Boolean).slice(0, 200) : [];
  const suites: string[] = [];
  const invalid: string[] = [];
  for (const t of tokens) {
    if (SUITE.test(t)) { if (!suites.includes(t)) suites.push(t); }
    else if (!invalid.includes(t)) invalid.push(t);
  }
  return { suites, invalid };
}

export type FrontDeskRoom = RoomDoc & { occ?: string; arrivalDate?: string | null };

// What today's lists change on one suite. Returns null when nothing changes.
export function frontDeskChange(
  room: FrontDeskRoom,
  { departure, arrival }: { departure: boolean; arrival: boolean },
  today: string,
): { changes: Partial<FrontDeskRoom>; summary: string } | null {
  const changes: Partial<FrontDeskRoom> = {};
  const notes: string[] = [];
  if (departure) {
    if (room.occ !== "checkout") changes.occ = "checkout";
    if (room.serviceType !== "turnover") changes.serviceType = "turnover";
    // A suite cleaned before the guest left needs cleaning again after they go.
    if (room.status === "clean") changes.status = room.attendant ? "assigned" : "dirty";
    notes.push("departure");
  }
  if (arrival) {
    if (room.arrivalDate !== today) changes.arrivalDate = today;
    const priority = departure ? "urgent" : "high"; // same-day turn first
    if (room.priority !== "urgent" && room.priority !== priority) changes.priority = priority;
    notes.push(departure ? "arrival (same-day turn)" : "arrival");
  }
  if (!Object.keys(changes).length) return null;
  const what: string[] = [];
  if (changes.occ) what.push("marked checking out");
  if (changes.status) what.push(`needs cleaning (was clean)`);
  if (changes.priority) what.push(`priority ${room.priority} → ${changes.priority}`);
  if (changes.arrivalDate && !changes.priority) what.push("marked arriving today");
  if (!what.length) what.push("set up for a turnover");
  return { changes, summary: `${notes.join(" and ").replace(/^./, (c) => c.toUpperCase())}: ${what.join(", ")}.` };
}

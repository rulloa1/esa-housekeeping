// Extended Stay America Suites — Houston IAH Airport
// New-day reset, run once each morning by the daily cron right after it saves the day's snapshot.
// It only clears yesterday's front-desk flags; it never changes a suite that still needs work, and
// it leaves the 3D board's own daily fields (tasks, lastFull, DND) alone.
import type { RoomDoc } from "./models";

export type RolloverRoom = RoomDoc & { occ?: string; arrivalDate?: string | null };

const READY = new Set(["clean"]);

export function rolloverChange(room: RolloverRoom, today: string): { changes: Partial<RolloverRoom>; summary: string[] } | null {
  const changes: Partial<RolloverRoom> = {};
  const summary: string[] = [];

  // Yesterday's arrivals list no longer applies.
  if (room.arrivalDate && room.arrivalDate < today) {
    changes.arrivalDate = null;
    summary.push("cleared yesterday's arrival");
  }
  const ready = READY.has(room.status);
  // A checkout that has been turned over is an empty, ready suite now.
  if (room.occ === "checkout" && ready) {
    changes.occ = "vacant";
    summary.push("checkout → vacant");
  }
  // Priority raised for yesterday's arrivals or checkouts goes back to normal once the suite is ready.
  const arrivingToday = room.arrivalDate === today;
  if (ready && !arrivingToday && (room.priority === "urgent" || room.priority === "high")) {
    changes.priority = "standard";
    summary.push(`priority ${room.priority} → standard`);
  }
  return summary.length ? { changes, summary } : null;
}

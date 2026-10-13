// New work for one housekeeper, found by comparing two copies of the suites (before and after a
// live update). Pure, so it is unit-tested; components/HousekeeperAlerts.tsx shows the result.
import { isGuestTask, type RoomDoc } from "./models";

export interface WorkAlert {
  id: string;
  kind: "assigned" | "guest" | "failed";
  suite: string;
  text: string;
}

const GUEST_TEXT: Record<string, string> = {
  cleaning: "asked for cleaning",
  towels: "asked for fresh towels",
  amenities: "asked for an amenities refill",
};

const openRequests = (r: RoomDoc | undefined) =>
  (r?.guestRequests ?? []).filter((g) => isGuestTask(g.type) && !g.doneAt);

export function newWorkAlerts(before: RoomDoc[], after: RoomDoc[], me: string): WorkAlert[] {
  const old = new Map(before.map((r) => [r.id, r]));
  const out: WorkAlert[] = [];
  for (const room of after) {
    if (room.attendant !== me) continue;
    const was = old.get(room.id);
    if (!was) continue; // suites that weren't loaded before aren't news
    const stamp = room.updatedAt || String(Date.now());
    // Taking an unassigned suite yourself is not news.
    const byMe = room.history?.[0]?.by === me;
    if (was.attendant !== me && !byMe) {
      const urgent = room.priority === "urgent" ? " (urgent)" : room.priority === "high" ? " (high priority)" : "";
      out.push({ id: `a-${room.id}-${stamp}`, kind: "assigned", suite: room.id, text: `Suite ${room.id} was assigned to you${urgent}.` });
    }
    const seen = new Set(openRequests(was).map((g) => g.at));
    for (const g of openRequests(room)) {
      if (!seen.has(g.at)) {
        out.push({ id: `g-${room.id}-${g.at}`, kind: "guest", suite: room.id, text: `Guest in ${room.id} ${GUEST_TEXT[g.type] ?? "made a request"}.` });
      }
    }
    if (room.status === "inspection_failed" && was.status !== "inspection_failed") {
      const why = room.inspectionFailReasons?.length ? `: ${room.inspectionFailReasons.slice(0, 2).join(", ")}` : "";
      out.push({ id: `f-${room.id}-${stamp}`, kind: "failed", suite: room.id, text: `Suite ${room.id} failed inspection${why}.` });
    }
  }
  return out;
}

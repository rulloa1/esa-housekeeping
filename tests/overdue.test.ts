import { describe, expect, it } from "vitest";
import { describe as label, hotelMinutes, overdueAll, overdueFor } from "@/lib/overdue";
import { toRoom } from "@/lib/roomView";

// 2026-10-13 16:00 in Houston (CDT, UTC-5) is 21:00 UTC.
const at4pm = new Date("2026-10-13T21:00:00Z");
const ago = (min: number, from = at4pm) => new Date(from.getTime() - min * 60000).toISOString();

describe("overdue flags", () => {
  it("uses hotel time", () => {
    expect(hotelMinutes(at4pm)).toBe(16 * 60);
  });

  it("flags a guest request left open over 30 minutes, but not a done one or DND", () => {
    const room = toRoom("214", {
      status: "clean",
      guestRequests: [
        { type: "towels", at: ago(45) },
        { type: "cleaning", at: ago(90), doneAt: ago(10) },
        { type: "dnd_on", at: ago(300) },
      ],
    });
    const flags = overdueFor(room, at4pm);
    expect(flags).toEqual([{ suite: "214", kind: "guest", minutes: 45, attendant: null }]);
    expect(label(flags[0])).toBe("Guest request waiting 45 min");
  });

  it("flags a checkout that isn't clean after 3 PM, not before", () => {
    const room = toRoom("110", { status: "dirty", occ: "checkout", attendant: "Rosa M." });
    expect(overdueFor(room, at4pm)).toEqual([{ suite: "110", kind: "checkin", minutes: 60, attendant: "Rosa M." }]);
    expect(overdueFor(room, new Date("2026-10-13T19:00:00Z"))).toEqual([]); // 2 PM
    expect(overdueFor(toRoom("110", { status: "clean", occ: "checkout" }), at4pm)).toEqual([]);
    expect(overdueFor(toRoom("111", { status: "dirty", occ: "occupied" }), at4pm)).toEqual([]);
  });

  it("flags long cleans, waiting inspections and old maintenance, most urgent first", () => {
    const rooms = [
      toRoom("301", { status: "in_progress", startedAt: ago(75) }),
      toRoom("302", { status: "awaiting_inspection", completedAt: ago(40) }),
      toRoom("303", { status: "maintenance", maintenanceIssues: [{ id: "m", status: "open", reportedAt: ago(26 * 60) }] }),
      toRoom("304", { status: "in_progress", startedAt: ago(20) }),
      toRoom("305", { status: "clean", guestRequests: [{ type: "amenities", at: ago(31) }] }),
    ];
    expect(overdueAll(rooms, at4pm).map((f) => `${f.suite}:${f.kind}`)).toEqual([
      "305:guest", "302:inspection", "301:cleaning", "303:maintenance",
    ]);
  });
});

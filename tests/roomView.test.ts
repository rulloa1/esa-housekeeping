import { describe, expect, it } from "vitest";
import { toRoom, toRooms } from "@/lib/roomView";

describe("toRoom", () => {
  it("fills in a suite saved only by the 3D board", () => {
    const r = toRoom("214", { status: "inspected", occ: "checkout", notes: "x", audit: { fridge: true } });
    expect(r).toMatchObject({ id: "214", floor: 2, status: "clean", inspectionResult: "pass", serviceType: "turnover", priority: "standard", type: "Queen Studio", notes: "x" });
    expect(r.history).toEqual([]);
    expect(r.maintenanceIssues).toEqual([]);
  });
  it("copes with empty and odd records", () => {
    const rooms = toRooms({ "101": {}, "102": null, "103": { status: "bogus", history: "nope" } });
    expect(rooms["101"].status).toBe("dirty");
    expect(rooms["102"].status).toBe("not_logged");
    expect(rooms["103"].status).toBe("dirty");
    expect(Object.keys(rooms)).toHaveLength(123);
  });
});

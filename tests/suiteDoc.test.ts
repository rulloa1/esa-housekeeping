import { describe, expect, it } from "vitest";
import { changesFrom, describeChanges, guestRequestUnseen, validateChanges } from "@/lib/suiteDoc";

const base = {
  status: "in_progress", occ: "occupied", notes: "", audit: { fridge: true }, attendant: "Ana G.",
  tasks: { date: "2026-10-12", done: { "Towel exchange": true } }, history: [{ id: "h1" }], updatedBy: "housekeeping",
};

describe("changesFrom", () => {
  it("returns only what the board changed", () => {
    const next = { ...base, occ: "checkout", dndSince: "2026-10-12" };
    expect(changesFrom(base, base, next).changes).toEqual({ occ: "checkout", dndSince: "2026-10-12" });
  });

  it("never carries server-owned fields from a stale copy", () => {
    const current = { ...base, history: [{ id: "h2" }, { id: "h1" }], maintenanceIssues: [{ id: "m1" }] };
    const next = { ...base, history: [], maintenanceIssues: [], guestRequests: [], status: "dirty" };
    expect(changesFrom(current, base, next).changes).toEqual({ status: "dirty" });
  });

  it("merges ticks from two devices on the same suite", () => {
    const afterA = { ...base, audit: { fridge: true, burners: true } };
    const b = { ...base, audit: { fridge: true, microwave: true } };
    const { changes, conflicts } = changesFrom(afterA, base, b);
    expect(changes.audit).toEqual({ fridge: true, burners: true, microwave: true });
    expect(conflicts).toEqual([]);
  });

  it("keeps guest note lines added meanwhile", () => {
    const b = { ...base, notes: "leaky tap" };
    const current = { ...b, notes: "Guest: Cleaning requested at 9:10 AM\nleaky tap" };
    const { changes } = changesFrom(current, b, { ...b, notes: "leaky tap, reported" });
    expect(changes.notes).toBe("Guest: Cleaning requested at 9:10 AM\nleaky tap, reported");
  });

  it("lets this save win a real clash and reports it", () => {
    const current = { ...base, status: "clean" };
    const { changes, conflicts } = changesFrom(current, base, { ...base, status: "ooo" });
    expect(changes.status).toBe("ooo");
    expect(conflicts).toEqual(["status"]);
  });

  it("an undo only reverts the fields it changed", () => {
    const saved = { ...base, status: "clean" };
    const current = { ...saved, attendant: "Rosa M." };
    expect(changesFrom(current, saved, base).changes).toEqual({ status: "in_progress" });
  });

  it("clears a field the board removed", () => {
    const { attendant: _a, ...without } = base;
    expect(changesFrom(base, base, without).changes).toEqual({ attendant: null });
  });
});

describe("guestRequestUnseen", () => {
  const req = { type: "towels", at: "2026-10-12T09:04:00Z" };
  it("is true when the board saved from a copy without the newest request", () => {
    expect(guestRequestUnseen({ updatedBy: "guest", guestRequests: [req] }, { guestRequests: [] })).toBe(true);
  });
  it("is false once the board had seen it", () => {
    expect(guestRequestUnseen({ updatedBy: "guest", guestRequests: [req] }, { guestRequests: [req] })).toBe(false);
  });
});

describe("validateChanges", () => {
  it("accepts what the board and the dashboard write", () => {
    expect(validateChanges({ status: "awaiting_inspection", occ: "vacant", dndSince: null, audit: { fridge: false }, notes: "x", checklist: { bed_linens: true }, priority: "urgent" })).toEqual([]);
  });
  it("rejects bad values", () => {
    expect(validateChanges({ status: "bogus" })).toHaveLength(1);
    expect(validateChanges({ dndSince: "yesterday" })).toHaveLength(1);
    expect(validateChanges({ notes: "x".repeat(5000) })).toHaveLength(1);
  });
});

describe("describeChanges", () => {
  it("names the board fields that changed", () => {
    expect(describeChanges(base, { ...base, occ: "checkout", audit: { fridge: false } })).toBe("Updated occupancy, kitchenette audit.");
    expect(describeChanges(base, base)).toBeNull();
  });
});

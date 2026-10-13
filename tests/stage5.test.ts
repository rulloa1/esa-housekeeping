import { describe, expect, it } from "vitest";
import { toRoom } from "@/lib/roomView";
import { rolloverChange } from "@/lib/rollover";
import { validSubscription, notify } from "@/lib/push";
import { builtInSettings } from "@/lib/auth";

const today = "2026-10-14";

describe("new-day reset", () => {
  it("turns a cleaned checkout into a vacant, normal-priority suite and clears old arrivals", () => {
    const room = { ...toRoom("104", { status: "clean", occ: "checkout", priority: "urgent" }), arrivalDate: "2026-10-13" };
    expect(rolloverChange(room, today)!.changes).toEqual({ arrivalDate: null, occ: "vacant", priority: "standard" });
  });
  it("leaves suites that still need work, and today's arrivals", () => {
    expect(rolloverChange(toRoom("105", { status: "dirty", occ: "checkout", priority: "urgent" }), today)).toBeNull();
    expect(rolloverChange({ ...toRoom("106", { status: "clean", priority: "high" }), arrivalDate: today }, today)).toBeNull();
    expect(rolloverChange(toRoom("107", { status: "clean", occ: "occupied", priority: "standard" }), today)).toBeNull();
  });
});

describe("notifications", () => {
  it("accepts only well-formed https subscriptions", () => {
    expect(validSubscription({ endpoint: "https://push.example/abc", keys: { p256dh: "k", auth: "a" } })).toBe(true);
    expect(validSubscription({ endpoint: "http://push.example/abc", keys: { p256dh: "k", auth: "a" } })).toBe(false);
    expect(validSubscription({ endpoint: "https://push.example/abc" })).toBe(false);
  });
  it("does nothing when keys aren't set up", async () => {
    expect(await notify({ names: ["Ana"], supervisors: true }, { title: "t", body: "b" })).toBe(0);
  });
});

describe("settings warning", () => {
  it("names the settings that fall back to sample values", () => {
    expect(builtInSettings()).toEqual(expect.arrayContaining(["AUTH_SECRET", "ADMIN_PIN"]));
  });
});

import { describe, expect, it } from "vitest";
import { toRoom } from "@/lib/roomView";
import { newWorkAlerts } from "@/lib/alerts";
import { frontDeskChange, parseSuiteList } from "@/lib/frontDesk";
import { buildReport, hotelDay, lastDays, reportCsv } from "@/lib/report";
import { overdueFor } from "@/lib/overdue";

const ev = (event: string, by: string, timestamp: string, details = "") => ({ id: timestamp + event, event, by, role: "x", timestamp, details });

describe("housekeeper alerts", () => {
  const before = [toRoom("101", { attendant: "Ana" }), toRoom("102", {}), toRoom("103", { attendant: "Ana" })];
  it("announces a suite assigned to me, a new guest request and a failed inspection", () => {
    const after = [
      toRoom("101", { attendant: "Ana", guestRequests: [{ type: "towels", at: "t1" }, { type: "dnd_on", at: "t0" }] }),
      toRoom("102", { attendant: "Ana", priority: "urgent", updatedAt: "u", history: [ev("Assignment Updated", "Supervisor", "u")] }),
      toRoom("103", { attendant: "Ana", status: "inspection_failed", inspectionFailReasons: ["Mirror streaked"], updatedAt: "v" }),
    ];
    expect(newWorkAlerts(before, after, "Ana").map((a) => a.text)).toEqual([
      "Guest in 101 asked for fresh towels.",
      "Suite 102 was assigned to you (urgent).",
      "Suite 103 failed inspection: Mirror streaked.",
    ]);
    expect(newWorkAlerts(before, after, "Rosa")).toEqual([]);
  });
  it("stays quiet when I took the suite myself", () => {
    const after = [toRoom("102", { attendant: "Ana", status: "in_progress", history: [ev("Cleaning Started", "Ana", "u")] })];
    expect(newWorkAlerts(before, after, "Ana")).toEqual([]);
  });
});

describe("departures and arrivals", () => {
  it("parses any list of suite numbers", () => {
    expect(parseSuiteList("104, 117\n212 999 104 abc")).toEqual({ suites: ["104", "117", "212"], invalid: ["999", "abc"] });
  });
  it("turns a departure into a turnover and raises arrivals", () => {
    const today = "2026-10-13";
    const dep = frontDeskChange(toRoom("104", { status: "clean", occ: "occupied" }), { departure: true, arrival: true }, today)!;
    expect(dep.changes).toEqual({ occ: "checkout", serviceType: "turnover", status: "dirty", arrivalDate: today, priority: "urgent" });
    const arr = frontDeskChange(toRoom("220", { status: "clean" }), { departure: false, arrival: true }, today)!;
    expect(arr.changes).toEqual({ arrivalDate: today, priority: "high" });
    expect(frontDeskChange({ ...toRoom("220", {}), arrivalDate: today, priority: "high" }, { departure: false, arrival: true }, today)).toBeNull();
  });
  it("flags an arrival not ready by 3 PM", () => {
    const at4pm = new Date("2026-10-13T21:00:00Z");
    const room = { ...toRoom("220", { status: "dirty", occ: "occupied" }), arrivalDate: "2026-10-13" };
    expect(overdueFor(room, at4pm).map((f) => f.kind)).toEqual(["checkin"]);
  });
});

describe("shift report", () => {
  const day = "2026-10-13";
  const rooms = [
    toRoom("101", {
      attendant: "Ana",
      history: [
        ev("Inspection Passed", "Sam", "2026-10-13T17:00:00Z"),
        ev("Cleaning Completed", "Ana", "2026-10-13T16:40:00Z"),
        ev("Cleaning Started", "Ana", "2026-10-13T16:10:00Z"),
        ev("Cleaning Completed", "Ana", "2026-10-12T16:40:00Z"),
      ],
      guestRequests: [{ type: "towels", at: "2026-10-13T15:00:00Z", doneAt: "2026-10-13T15:20:00Z" }, { type: "cleaning", at: "2026-10-13T18:00:00Z" }],
    }),
    toRoom("102", {
      attendant: "Rosa",
      history: [
        ev("Inspection Passed", "Sam", "2026-10-13T19:00:00Z"),
        ev("Inspection Failed", "Sam", "2026-10-13T18:00:00Z"),
        ev("Status Changed", "Housekeeper", "2026-10-13T17:50:00Z", "Status changed from in_progress to clean"),
        ev("Status Changed", "Housekeeper", "2026-10-13T17:00:00Z", "Status changed from dirty to in_progress"),
      ],
    }),
  ];
  it("counts the day's work by person", () => {
    const r = buildReport(rooms, day);
    expect(r).toMatchObject({
      cleaned: 2, avgCleanMinutes: 40, inspectionsPassed: 2, inspectionsFailed: 1, firstTimePassRate: 50,
      guestRequests: 2, guestDone: 1, guestOpen: 1, guestMedianMinutes: 20,
    });
    expect(r.people).toEqual([
      { name: "Ana", cleaned: 1, avgMinutes: 30, passed: 1, failed: 0 },
      { name: "Rosa", cleaned: 1, avgMinutes: 50, passed: 1, failed: 1 },
    ]);
  });
  it("uses hotel days and safe CSV", () => {
    expect(hotelDay("2026-10-13T03:00:00Z")).toBe("2026-10-12");
    expect(lastDays("2026-03-01", 3)).toEqual(["2026-03-01", "2026-02-28", "2026-02-27"]);
    const csv = reportCsv({ ...buildReport([], day), people: [{ name: "=HYPERLINK(1)", cleaned: 0, avgMinutes: null, passed: 0, failed: 0 }] });
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
  });
});

describe("departure summary", () => {
  it("reads plainly", () => {
    const c = frontDeskChange(toRoom("104", { status: "clean", occ: "occupied" }), { departure: true, arrival: true }, "2026-10-13")!;
    expect(c.summary).toBe("Departure and arrival (same-day turn): marked checking out, needs cleaning (was clean), priority standard → urgent.");
  });
});

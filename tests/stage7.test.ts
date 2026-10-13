import { describe, expect, it } from "vitest";
import { addNote, listNotes, newNote, setDone } from "@/lib/handover";
import { openNotes } from "@/lib/handoverShared";
import { deviceOf, recentSignins, recordSignin, summarize } from "@/lib/signins";

describe("handover log", () => {
  it("needs text and a real suite number if one is given", () => {
    expect(() => newNote({ text: " " }, "Ana", "supervisor")).toThrow("text");
    expect(() => newNote({ text: "Late checkout", suite: "999" }, "Ana", "supervisor")).toThrow("suite");
    expect(newNote({ text: "Late checkout 1 PM", suite: "214", topic: "Nope", important: true }, "Ana", "supervisor"))
      .toMatchObject({ suite: "214", topic: "Other", important: true, by: "Ana" });
  });
  it("lists open notes from the last day, important first", () => {
    const now = Date.parse("2026-10-13T12:00:00Z");
    const a = newNote({ text: "Old" }, "A", "supervisor", new Date("2026-10-11T12:00:00Z"));
    const b = newNote({ text: "Normal" }, "B", "supervisor", new Date("2026-10-13T11:00:00Z"));
    const c = newNote({ text: "Urgent", important: true }, "C", "supervisor", new Date("2026-10-13T08:00:00Z"));
    const d = { ...newNote({ text: "Handled" }, "D", "supervisor", new Date("2026-10-13T10:00:00Z")), doneAt: "2026-10-13T10:30:00Z" };
    expect(openNotes([a, b, c, d], now).map((n) => n.text)).toEqual(["Urgent", "Normal"]);
  });
  it("drops notes older than 30 days when a new one is added, and marks handled", async () => {
    const old = newNote({ text: "Ancient" }, "A", "supervisor", new Date(Date.now() - 40 * 86_400_000));
    await addNote(old, Date.now() - 40 * 86_400_000);
    const fresh = newNote({ text: "Fresh" }, "B", "supervisor");
    await addNote(fresh);
    const ids = (await listNotes()).map((n) => n.id);
    expect(ids).toContain(fresh.id);
    expect(ids).not.toContain(old.id);
    expect(await setDone(fresh.id, true, "Sup")).toMatchObject({ doneBy: "Sup" });
    expect((await setDone(fresh.id, false, "Sup")).doneAt).toBeUndefined();
    await expect(setDone("ho-missing", true, "x")).rejects.toThrow("notFound");
  });
});

describe("sign-in activity", () => {
  it("names the kind of device only", () => {
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("iPad");
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit Mobile/15E148")).toBe("iPad");
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("iPhone");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14)")).toBe("Android");
    expect(deviceOf(null)).toBe("Other");
  });
  it("records newest first and counts the last day", async () => {
    await recordSignin({ outcome: "wrongPin", role: "supervisor", name: null, device: "iPad" });
    await recordSignin({ outcome: "signedIn", role: "housekeeper", name: "Maria S.", device: "iPhone" });
    const list = await recentSignins(10);
    expect(list[0]).toMatchObject({ outcome: "signedIn", name: "Maria S." });
    expect(JSON.stringify(list)).not.toMatch(/pin":|\d+\.\d+\.\d+\.\d+/);
    expect(summarize(list)).toMatchObject({ signedIn: 1, wrongPin: 1, locked: 0 });
  });
});

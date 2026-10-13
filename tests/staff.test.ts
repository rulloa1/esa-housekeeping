import { describe, expect, it } from "vitest";
import { parseSessionCookie, sessionPayload, staffPinKey } from "@/lib/auth";
import { cleanName, cleanPin, cleanRole, createStaff, findByPin, publicView, updateStaff, StaffError } from "@/lib/staff";

const reason = (fn: () => unknown) => {
  try { fn(); } catch (e) { return (e as StaffError).reason; }
  return null;
};

describe("roster validation", () => {
  it("tidies names and refuses blank or long ones", () => {
    expect(cleanName("  Maria   S. ")).toBe("Maria S.");
    expect(reason(() => cleanName("A"))).toBe("name");
    expect(reason(() => cleanName("x".repeat(41)))).toBe("name");
  });

  it("accepts 4 to 8 digit PINs that aren't a shared role PIN", () => {
    expect(cleanPin("4821")).toBe("4821");
    expect(reason(() => cleanPin("12a4"))).toBe("pin");
    expect(reason(() => cleanPin("123"))).toBe("pin");
    // 1234 / 9999 are the development role PINs.
    expect(reason(() => cleanPin("1234"))).toBe("pinTaken");
    expect(reason(() => cleanPin("9999"))).toBe("pinTaken");
  });

  it("only knows the three roles", () => {
    expect(cleanRole("supervisor")).toBe("supervisor");
    expect(reason(() => cleanRole("frontdesk"))).toBe("role");
  });
});

describe("session cookie", () => {
  it("reads shared and personal sessions", () => {
    expect(parseSessionCookie(`${sessionPayload("supervisor", 5)}.sig`)).toMatchObject({ role: "supervisor", expires: 5, staffId: undefined, payload: "supervisor.5" });
    expect(parseSessionCookie(`${sessionPayload("housekeeper", 5, "abc123")}.sig`)).toMatchObject({ staffId: "abc123", payload: "housekeeper.5.abc123", sig: "sig" });
  });

  it("refuses malformed cookies", () => {
    expect(parseSessionCookie("supervisor.5")).toBeNull();
    expect(parseSessionCookie("a.b.C!D.sig")).toBeNull();
    expect(parseSessionCookie("a.b.c.d.e")).toBeNull();
  });
});

describe("roster store (in memory)", () => {
  it("signs people in by their own PIN until switched off", async () => {
    const ana = await createStaff({ name: "Ana Test", role: "housekeeper", pin: "48213" });
    expect(publicView(ana)).not.toHaveProperty("pinKey");
    expect(ana.pinKey).toBe(staffPinKey("48213"));
    expect((await findByPin("48213"))?.id).toBe(ana.id);

    await expect(createStaff({ name: "Other", role: "housekeeper", pin: "48213" })).rejects.toMatchObject({ reason: "pinTaken" });
    await expect(createStaff({ name: "ana test", role: "admin", pin: "55501" })).rejects.toMatchObject({ reason: "nameTaken" });

    await updateStaff(ana.id, { pin: "77120" });
    expect(await findByPin("48213")).toBeNull();
    expect((await findByPin("77120"))?.id).toBe(ana.id);

    await updateStaff(ana.id, { active: false });
    expect(await findByPin("77120")).toBeNull();
  });
});

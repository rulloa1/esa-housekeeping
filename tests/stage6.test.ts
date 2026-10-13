import { describe, expect, it } from "vitest";
import { cleanPhotoUrl, decodeDataUrl, loadPhoto, savePhoto, sniff, MAX_PHOTO_BYTES } from "@/lib/photos";
import { addItem, daysHeld, listItems, newItem, pastHold, setStatus } from "@/lib/lostFound";

// Smallest valid-looking files of each type (only the first bytes matter to sniff()).
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const dataUrl = (b: Buffer, type = "image/jpeg") => `data:${type};base64,${b.toString("base64")}`;

describe("photos", () => {
  it("knows images by their bytes, not their label", () => {
    expect(sniff(JPEG)).toBe("image/jpeg");
    expect(sniff(PNG)).toBe("image/png");
    expect(sniff(Buffer.from("<svg onload=alert(1)>....."))).toBeNull();
    expect(decodeDataUrl(dataUrl(PNG, "image/jpeg")).type).toBe("image/png");
  });
  it("refuses non-images, SVG and oversized files", () => {
    expect(() => decodeDataUrl("hello")).toThrow("badImage");
    expect(() => decodeDataUrl(dataUrl(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"), "image/svg+xml"))).toThrow("badImage");
    expect(() => decodeDataUrl(dataUrl(Buffer.concat([JPEG, Buffer.alloc(MAX_PHOTO_BYTES)])))).toThrow("tooBig");
  });
  it("keeps only photo addresses this app made", () => {
    expect(cleanPhotoUrl("/api/photos/0123456789abcdef01234567")).toBe("/api/photos/0123456789abcdef01234567");
    expect(cleanPhotoUrl("https://evil.example/x.jpg")).toBeUndefined();
    expect(cleanPhotoUrl("/api/photos/../staff")).toBeUndefined();
    expect(cleanPhotoUrl(42)).toBeUndefined();
  });
  it("stores and returns a photo", async () => {
    const url = await savePhoto(dataUrl(JPEG), "Maria S.", "2026-10-13");
    const back = await loadPhoto(url.split("/").pop()!);
    expect(back?.type).toBe("image/jpeg");
    expect(back?.bytes.equals(JPEG)).toBe(true);
    expect(await loadPhoto("nope")).toBeNull();
  });
});

describe("lost & found", () => {
  it("needs a description, and a real suite number when found in a suite", () => {
    expect(() => newItem({ description: "", place: "Lobby" }, "Ana")).toThrow("description");
    expect(() => newItem({ description: "Phone", place: "Suite", suite: "999" }, "Ana")).toThrow("suite");
    const item = newItem({ description: "  Black   phone ", place: "Suite", suite: "214", valuable: true, photoUrl: "https://x.example/a.jpg" }, "Ana");
    expect(item).toMatchObject({ description: "Black phone", suite: "214", valuable: true, status: "held", foundBy: "Ana" });
    expect(item.photoUrl).toBeUndefined();
    expect(newItem({ description: "Hat", place: "Somewhere odd", suite: "214" }, "Ana")).toMatchObject({ place: "Other", suite: null });
  });
  it("flags items held past 90 days", () => {
    const item = newItem({ description: "Umbrella", place: "Lobby" }, "Ana", new Date("2026-07-01T12:00:00Z"));
    expect(daysHeld(item, Date.parse("2026-10-01T12:00:00Z"))).toBe(92);
    expect(pastHold(item, Date.parse("2026-10-01T12:00:00Z"))).toBe(true);
    expect(pastHold(item, Date.parse("2026-07-20T12:00:00Z"))).toBe(false);
  });
  it("closes out and reopens an item, keeping it in the log", async () => {
    const item = newItem({ description: "Laptop charger", place: "Breakfast area" }, "Ana");
    await addItem(item);
    const closed = await setStatus(item.id, "returned", "Front Desk", "Picked up at front desk");
    expect(closed).toMatchObject({ status: "returned", closedBy: "Front Desk", closeNote: "Picked up at front desk" });
    const reopened = await setStatus(item.id, "held", "Front Desk", "");
    expect(reopened.closedBy).toBeUndefined();
    expect((await listItems()).some((i) => i.id === item.id)).toBe(true);
    await expect(setStatus(item.id, "lost", "x", "")).rejects.toThrow("status");
    await expect(setStatus("lf-missing", "returned", "x", "")).rejects.toThrow("notFound");
  });
});

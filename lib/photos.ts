// Extended Stay America Suites — Houston IAH Airport
// Photos attached to maintenance tickets, failed inspections and lost & found items.
//
// The phone shrinks each photo before sending it (components/PhotoPicker.tsx), so one photo is
// usually 50 to 150 KB. Each is stored under its own Redis key, hk:photo:<id>, and expires after
// PHOTO_DAYS, so photos can't pile up. Photos are only served to signed-in staff
// (app/api/photos/[id]); the suite record keeps just the path /api/photos/<id>.
import { randomBytes } from "node:crypto";
import { getValue, hit, setExpiring } from "./store";

export const PHOTO_DAYS = 90;
export const MAX_PHOTO_BYTES = 400 * 1024;
export const PHOTOS_PER_DAY = 300; // across the hotel, a ceiling against runaway uploads
export const PHOTOS_PER_HOUR_PER_PERSON = 40;

const TYPES: { type: string; magic: number[] }[] = [
  { type: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { type: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/webp", magic: [0x52, 0x49, 0x46, 0x46] }, // "RIFF", checked with "WEBP" below
];

export class PhotoError extends Error {
  constructor(public reason: "badImage" | "tooBig" | "tooMany", public status = 400) {
    super(reason);
  }
}

// The image type of the bytes, from their first bytes (never from what the browser claimed).
export function sniff(bytes: Buffer): string | null {
  for (const t of TYPES) {
    if (bytes.length < 12 || !t.magic.every((b, i) => bytes[i] === b)) continue;
    if (t.type === "image/webp" && bytes.subarray(8, 12).toString("ascii") !== "WEBP") continue;
    return t.type;
  }
  return null;
}

// Accepts "data:image/jpeg;base64,...." and returns the decoded bytes and their real type.
export function decodeDataUrl(dataUrl: unknown): { type: string; bytes: Buffer } {
  if (typeof dataUrl !== "string") throw new PhotoError("badImage");
  const m = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new PhotoError("badImage");
  if (m[1].length > Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 4) throw new PhotoError("tooBig", 413);
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length > MAX_PHOTO_BYTES) throw new PhotoError("tooBig", 413);
  const type = sniff(bytes);
  if (!type) throw new PhotoError("badImage");
  return { type, bytes };
}

const ID = /^[a-f0-9]{24}$/;
export const photoPath = (id: string) => `/api/photos/${id}`;

// Only paths this app handed out are kept on records; anything else (an outside link) is dropped.
export function cleanPhotoUrl(url: unknown): string | undefined {
  if (typeof url !== "string") return undefined;
  const m = /^\/api\/photos\/([a-f0-9]{24})$/.exec(url);
  return m ? url : undefined;
}

export async function savePhoto(dataUrl: unknown, who: string, today: string): Promise<string> {
  const { type, bytes } = decodeDataUrl(dataUrl);
  const hour = Math.floor(Date.now() / 3_600_000);
  if ((await hit(`hk:photo:count:${who.toLowerCase()}:${hour}`, 3600)) > PHOTOS_PER_HOUR_PER_PERSON) throw new PhotoError("tooMany", 429);
  if ((await hit(`hk:photo:count:day:${today}`, 86400 * 2)) > PHOTOS_PER_DAY) throw new PhotoError("tooMany", 429);
  const id = randomBytes(12).toString("hex");
  await setExpiring(`hk:photo:${id}`, JSON.stringify({ type, data: bytes.toString("base64"), at: new Date().toISOString(), by: who }), PHOTO_DAYS * 86400);
  return photoPath(id);
}

export async function loadPhoto(id: string): Promise<{ type: string; bytes: Buffer } | null> {
  if (!ID.test(id)) return null;
  const raw = await getValue(`hk:photo:${id}`);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { type: string; data: string };
    return { type: p.type, bytes: Buffer.from(p.data, "base64") };
  } catch {
    return null;
  }
}

// Extended Stay America Suites — Houston IAH Airport
// Lost & found log: items staff find in suites or around the hotel, held until returned or
// disposed of. One Redis hash, hk:lostfound (item id -> JSON LostItem). Nothing is ever deleted;
// closed items stay in the log as the record of what happened to them.
//
// Keep guest details out of it: the log records the item, where it was found and what happened,
// not the guest's name, phone or address (those stay in the hotel's own system).
import { randomBytes } from "node:crypto";
import { hashGetAll, hashGet, hashWrite } from "./store";
import { cleanPhotoUrl } from "./photos";
import { HOLD_DAYS, LOST_STATUSES, PLACES, type LostItem, type LostStatus } from "./lostFoundShared";

export { HOLD_DAYS, LOST_STATUSES, PLACES, type LostItem, type LostStatus };

const KEY = "hk:lostfound";
export const MAX_ITEMS_SHOWN = 300;

export class LostFoundError extends Error {
  constructor(public reason: string, public status = 400) { super(reason); }
}

const SUITE = /^[1-3](0[1-9]|[12]\d|3[0-2])$/;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

export function newItem(input: Record<string, unknown>, foundBy: string, now = new Date()): LostItem {
  const description = text(input.description, 200);
  if (description.length < 2) throw new LostFoundError("description");
  const place = PLACES.includes(input.place as (typeof PLACES)[number]) ? (input.place as string) : "Other";
  const suite = place === "Suite" ? text(input.suite, 3) : "";
  if (place === "Suite" && !SUITE.test(suite)) throw new LostFoundError("suite");
  return {
    id: `lf-${now.getTime().toString(36)}-${randomBytes(3).toString("hex")}`,
    description,
    place,
    suite: suite || null,
    foundBy,
    foundAt: now.toISOString(),
    photoUrl: cleanPhotoUrl(input.photoUrl),
    storedAt: text(input.storedAt, 80) || undefined,
    valuable: input.valuable === true,
    status: "held",
  };
}

// Days an item has been held (whole days).
export const daysHeld = (item: LostItem, now = Date.now()) => Math.floor((now - Date.parse(item.foundAt)) / 86_400_000);
export const pastHold = (item: LostItem, now = Date.now()) => item.status === "held" && daysHeld(item, now) >= HOLD_DAYS;

export async function listItems(): Promise<LostItem[]> {
  const raw = await hashGetAll(KEY);
  const items: LostItem[] = [];
  for (const json of Object.values(raw)) {
    try { items.push(JSON.parse(json)); } catch {}
  }
  // Still held first (oldest first, so the ones nearing the hold limit are on top), then closed, newest first.
  return items.sort((a, b) =>
    a.status === "held" && b.status !== "held" ? -1
    : b.status === "held" && a.status !== "held" ? 1
    : a.status === "held" ? a.foundAt.localeCompare(b.foundAt)
    : (b.closedAt ?? b.foundAt).localeCompare(a.closedAt ?? a.foundAt),
  );
}

export async function addItem(item: LostItem): Promise<void> {
  await hashWrite([{ key: KEY, field: item.id, value: JSON.stringify(item) }]);
}

// Supervisors close an item as returned or disposed of, or reopen it (back to held) if that was a mistake.
export async function setStatus(id: unknown, status: unknown, by: string, note: unknown): Promise<LostItem> {
  if (typeof id !== "string") throw new LostFoundError("id");
  if (!LOST_STATUSES.includes(status as LostStatus)) throw new LostFoundError("status");
  const raw = await hashGet(KEY, id);
  if (!raw) throw new LostFoundError("notFound", 404);
  const item = JSON.parse(raw) as LostItem;
  item.status = status as LostStatus;
  if (item.status === "held") {
    delete item.closedBy; delete item.closedAt; delete item.closeNote;
  } else {
    item.closedBy = by;
    item.closedAt = new Date().toISOString();
    item.closeNote = text(note, 200) || undefined;
  }
  await hashWrite([{ key: KEY, field: id, value: JSON.stringify(item) }]);
  return item;
}

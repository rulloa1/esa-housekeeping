// Extended Stay America Suites — Houston IAH Airport
// Staff roster: each person gets their own PIN, so the history shows who did what and one
// person's access can be switched off without changing everyone's PIN.
//
// Stored in two Redis hashes (new keys; nothing existing is reshaped):
//   hk:staff      id      -> JSON StaffRecord
//   hk:staff:pin  pinKey  -> id        (pinKey is an HMAC of the PIN; PINs are never stored)
// The shared role PINs (HOUSEKEEPING_PIN, FRONTDESK_PIN, ADMIN_PIN) keep working alongside.
import { pinFor, staffPinKey } from "./auth";
import { hashGet, hashGetAll, hashWrite } from "./store";

export type StaffRole = "housekeeper" | "supervisor" | "admin";
export const STAFF_ROLES: StaffRole[] = ["housekeeper", "supervisor", "admin"];

export interface StaffRecord {
  id: string;
  name: string;
  role: StaffRole;
  active: boolean;
  pinKey: string;
  createdAt: string;
  updatedAt: string;
}

// What the API returns: never the PIN key.
export type StaffMember = Omit<StaffRecord, "pinKey">;

const STAFF_KEY = "hk:staff";
const PIN_KEY = "hk:staff:pin";

export const publicView = ({ pinKey: _pinKey, ...rest }: StaffRecord): StaffMember => rest;

export class StaffError extends Error {
  constructor(public reason: string, public status = 400) {
    super(reason);
  }
}

// ---------- Validation (pure, unit-tested) ----------
export function cleanName(name: unknown): string {
  if (typeof name !== "string") throw new StaffError("name");
  const n = name.replace(/\s+/g, " ").trim();
  if (n.length < 2 || n.length > 40) throw new StaffError("name");
  return n;
}

export function cleanRole(role: unknown): StaffRole {
  if (!STAFF_ROLES.includes(role as StaffRole)) throw new StaffError("role");
  return role as StaffRole;
}

export function cleanPin(pin: unknown): string {
  if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) throw new StaffError("pin");
  // A personal PIN may not match a shared role PIN, or signing in would be ambiguous.
  if (["housekeeper", "supervisor", "admin"].some((r) => pinFor(r) === pin)) throw new StaffError("pinTaken", 409);
  return pin;
}

// ---------- Reads ----------
export async function listStaff(): Promise<StaffRecord[]> {
  const all = await hashGetAll(STAFF_KEY);
  return Object.values(all)
    .map((raw) => JSON.parse(raw) as StaffRecord)
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
}

export async function getStaff(id: string): Promise<StaffRecord | null> {
  if (!/^[a-z0-9]{1,24}$/.test(id)) return null;
  const raw = await hashGet(STAFF_KEY, id);
  return raw ? (JSON.parse(raw) as StaffRecord) : null;
}

// The active staff member whose PIN this is, if any.
export async function findByPin(pin: string): Promise<StaffRecord | null> {
  if (!/^\d{4,8}$/.test(pin)) return null;
  const id = await hashGet(PIN_KEY, staffPinKey(pin));
  if (!id) return null;
  const staff = await getStaff(id);
  return staff?.active ? staff : null;
}

// Names to offer when assigning suites: active housekeepers on the roster.
export async function attendantNames(): Promise<string[]> {
  return (await listStaff()).filter((s) => s.active && s.role === "housekeeper").map((s) => s.name);
}

// ---------- Writes (admin only; the API checks the role) ----------
async function assertUnique(name: string, pinKey: string | null, selfId: string | null) {
  const all = await listStaff();
  if (all.some((s) => s.id !== selfId && s.active && s.name.toLowerCase() === name.toLowerCase())) {
    throw new StaffError("nameTaken", 409);
  }
  if (pinKey) {
    const owner = await hashGet(PIN_KEY, pinKey);
    if (owner && owner !== selfId) throw new StaffError("pinTaken", 409);
  }
}

export async function createStaff(input: { name: unknown; role: unknown; pin: unknown }): Promise<StaffRecord> {
  const name = cleanName(input.name);
  const role = cleanRole(input.role);
  const pinKey = staffPinKey(cleanPin(input.pin));
  await assertUnique(name, pinKey, null);
  const now = new Date().toISOString();
  const rec: StaffRecord = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, role, active: true, pinKey, createdAt: now, updatedAt: now,
  };
  await hashWrite([
    { key: STAFF_KEY, field: rec.id, value: JSON.stringify(rec) },
    { key: PIN_KEY, field: pinKey, value: rec.id },
  ]);
  return rec;
}

// Changes name, role, active, or PIN. Nobody is ever deleted: switching someone off keeps
// their name on past history entries and frees nothing else.
export async function updateStaff(
  id: string,
  input: { name?: unknown; role?: unknown; active?: unknown; pin?: unknown },
): Promise<StaffRecord> {
  const cur = await getStaff(id);
  if (!cur) throw new StaffError("notFound", 404);
  const next: StaffRecord = { ...cur, updatedAt: new Date().toISOString() };
  if (input.name !== undefined) next.name = cleanName(input.name);
  if (input.role !== undefined) next.role = cleanRole(input.role);
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") throw new StaffError("active");
    next.active = input.active;
  }
  if (input.pin !== undefined) next.pinKey = staffPinKey(cleanPin(input.pin));
  if (next.active) await assertUnique(next.name, next.pinKey !== cur.pinKey ? next.pinKey : null, id);

  const ops: { key: string; field: string; value: string | null }[] = [
    { key: STAFF_KEY, field: id, value: JSON.stringify(next) },
  ];
  if (next.pinKey !== cur.pinKey) {
    ops.push({ key: PIN_KEY, field: cur.pinKey, value: null }, { key: PIN_KEY, field: next.pinKey, value: id });
  }
  await hashWrite(ops);
  return next;
}

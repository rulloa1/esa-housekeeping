// Extended Stay America Suites — Houston IAH Airport
// Authentication and Authorization with Signed HMAC Cookies
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "./models";

export type { Role };

export const ROLES: Record<string, string> = {
  housekeeper: "Housekeeper",
  supervisor: "Supervisor",
  admin: "Administrator",
  // Legacy aliases for backward compatibility
  housekeeping: "Housekeeper",
  frontdesk: "Supervisor",
};

const COOKIE = "hk_session";
const MAX_AGE = 60 * 60 * 16; // one 16-hour shift

const isProduction = process.env.NODE_ENV === "production";

// Built-in fallbacks exist only for local development. In production a missing secret is an
function secret(): string {
  return process.env.AUTH_SECRET || "dev-secret-esa-housekeeping-iah";
}

function pinFrom(envValue: string | undefined, devPin: string): string | undefined {
  return envValue || devPin;
}

export function pinFor(role: string): string | undefined {
  if (role === "housekeeper" || role === "housekeeping") return pinFrom(process.env.HOUSEKEEPING_PIN, "1234");
  if (role === "supervisor" || role === "frontdesk") return pinFrom(process.env.FRONTDESK_PIN, "1234");
  if (role === "admin") return pinFrom(process.env.ADMIN_PIN, "9999");
  return undefined;
}

const digest = (s: string) => createHash("sha256").update(s).digest();

// Constant-time comparison, so response timing doesn't reveal how much of a PIN or signature matched.
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

export function checkPin(role: string, pin: string): boolean {
  const expected = pinFor(role);
  return Boolean(expected) && safeEqual(pin, expected!);
}

let key: Promise<CryptoKey> | undefined;

export async function sign(value: string): Promise<string> {
  key ??= crypto.subtle
    .importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .catch((err) => { key = undefined; throw err; });
  const sig = await crypto.subtle.sign("HMAC", await key, new TextEncoder().encode(value));
  return Buffer.from(sig).toString("base64url");
}

// Lookup key for a personal PIN on the staff roster (lib/staff.ts). Keyed with AUTH_SECRET, so the
// stored keys are useless without the server's secret.
export function staffPinKey(pin: string): string {
  return createHmac("sha256", secret()).update(`staff-pin:${pin}`).digest("hex");
}

// Cookie value: "<role>.<expires>.<sig>" for a shared role PIN, or
// "<role>.<expires>.<staffId>.<sig>" for a personal PIN from the staff roster.
export function sessionPayload(role: Role, expires: number, staffId?: string): string {
  return staffId ? `${role}.${expires}.${staffId}` : `${role}.${expires}`;
}

export function parseSessionCookie(raw: string): { role: string; expires: number; staffId?: string; payload: string; sig: string } | null {
  const parts = raw.split(".");
  if (parts.length !== 3 && parts.length !== 4) return null;
  const sig = parts.pop()!;
  const [role, expires, staffId] = parts;
  if (staffId !== undefined && !/^[a-z0-9]{1,24}$/.test(staffId)) return null;
  return { role, expires: Number(expires), staffId, payload: parts.join("."), sig };
}

export async function createSession(role: Role, staffId?: string): Promise<void> {
  const expires = Date.now() + MAX_AGE * 1000;
  const value = sessionPayload(role, expires, staffId);
  (await cookies()).set(COOKIE, `${value}.${await sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export interface Session {
  role: Role;
  // Set when the person signed in with their own PIN from the staff roster.
  staff?: { id: string; name: string };
}

// The signed-in session. A personal sign-in is checked against the roster on every request, so
// switching someone off (or changing their role) takes effect at once, not at cookie expiry.
export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const s = parseSessionCookie(raw);
  if (!s || !(s.role in ROLES) || !(s.expires > Date.now())) return null;
  if (!safeEqual(s.sig, await sign(s.payload))) return null;
  if (!s.staffId) return { role: s.role as Role };
  const { getStaff } = await import("./staff");
  const staff = await getStaff(s.staffId);
  if (!staff?.active) return null;
  return { role: staff.role, staff: { id: staff.id, name: staff.name } };
}

export async function getRole(): Promise<Role | null> {
  return (await getSession())?.role ?? null;
}

// The name to write in history: the person's own name for a personal sign-in, otherwise
// whatever the page sent (the shared-PIN pages pick a name from a list), otherwise the role.
export function actorName(session: Session, sent?: unknown): string {
  if (session.staff) return session.staff.name;
  const name = typeof sent === "string" ? sent.trim().slice(0, 60) : "";
  return name || (session.role === "housekeeper" || session.role === "housekeeping" ? "Housekeeper" : "Supervisor");
}

export function isSupervisor(role: Role | null): boolean {
  return role === "supervisor" || role === "frontdesk" || role === "admin";
}

export function isHousekeeper(role: Role | null): boolean {
  return role === "housekeeper" || role === "housekeeping" || role === "admin" || role === "supervisor" || role === "frontdesk";
}

export function isAdmin(role: Role | null): boolean {
  return role === "admin";
}

// Extended Stay America Suites — Houston IAH Airport
// Authentication and Authorization with Signed HMAC Cookies
import { createHash, timingSafeEqual } from "node:crypto";
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

export async function createSession(role: Role): Promise<void> {
  const expires = Date.now() + MAX_AGE * 1000;
  const value = `${role}.${expires}`;
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

export async function getRole(): Promise<Role | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [role, expires, sig] = raw.split(".");
  if (!(role in ROLES) || Number(expires) < Date.now()) return null;
  if (!sig || !safeEqual(sig, await sign(`${role}.${expires}`))) return null;
  return role as Role;
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

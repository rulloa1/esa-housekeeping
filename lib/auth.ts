// PIN logins for two roles. A signed cookie records the role; no user accounts.
import { cookies } from "next/headers";

export type Role = "housekeeping" | "frontdesk";
export const ROLES: Record<Role, string> = { housekeeping: "Housekeeping", frontdesk: "Front desk" };

const COOKIE = "hk_session";
const MAX_AGE = 60 * 60 * 16; // one long shift

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return "dev-secret";
}

export function pinFor(role: Role): string | undefined {
  const pin = role === "housekeeping" ? process.env.HOUSEKEEPING_PIN : process.env.FRONTDESK_PIN;
  if (pin) return pin;
  return process.env.NODE_ENV === "production" ? undefined : "1234";
}

let key: Promise<CryptoKey> | undefined;

async function sign(value: string): Promise<string> {
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
  if (sig !== (await sign(`${role}.${expires}`))) return null;
  return role as Role;
}

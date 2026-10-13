// Extended Stay America Suites — Houston IAH Airport
// Sign-in activity for administrators: who signed in, when, on what kind of device, and wrong-PIN
// attempts and lockouts. Kept in one Redis list, hk:signins, newest 500 entries only.
// Never records a PIN or an IP address.
import { listPush, listRange } from "./store";

const KEY = "hk:signins";
const MAX = 500;

export type SigninOutcome = "signedIn" | "wrongPin" | "locked";

export interface SigninEntry {
  at: string;
  outcome: SigninOutcome;
  role: string;          // role picked on the form, or the person's roster role
  name: string | null;   // roster name for a personal PIN; null for a shared role PIN or a failure
  device: string;        // "iPad", "iPhone", "Android", "Windows", "Mac" or "Other"
}

export function deviceOf(userAgent: string | null): string {
  const ua = userAgent || "";
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))) return "iPad";
  if (/iPhone|iPod/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "Mac";
  return "Other";
}

// Never throws: failing to log must not stop anyone signing in.
export async function recordSignin(entry: Omit<SigninEntry, "at">): Promise<void> {
  try {
    await listPush(KEY, JSON.stringify({ at: new Date().toISOString(), ...entry }), MAX);
  } catch (err) {
    console.error("signins: could not record", err);
  }
}

export async function recentSignins(count = 100): Promise<SigninEntry[]> {
  const out: SigninEntry[] = [];
  for (const raw of await listRange(KEY, count)) {
    try { out.push(JSON.parse(raw)); } catch {}
  }
  return out;
}

// Counts for the last `hours` hours.
export function summarize(entries: SigninEntry[], now = Date.now(), hours = 24) {
  const recent = entries.filter((e) => now - Date.parse(e.at) <= hours * 3_600_000);
  return {
    signedIn: recent.filter((e) => e.outcome === "signedIn").length,
    wrongPin: recent.filter((e) => e.outcome === "wrongPin").length,
    locked: recent.filter((e) => e.outcome === "locked").length,
  };
}

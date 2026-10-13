// Extended Stay America Suites — Houston IAH Airport
// Lock-screen notifications (Web Push) for staff phones and iPads.
//
// Needs three environment variables (see README): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and
// VAPID_SUBJECT. Without them everything here quietly does nothing and the app works as before.
//
// Subscriptions live in one new Redis hash, hk:push (endpoint hash -> JSON PushRecord).
import { createHash } from "node:crypto";
import webpush from "web-push";
import { hashGetAll, hashWrite } from "./store";

const KEY = "hk:push";
const MAX_PER_NAME = 5; // phones/tablets per person

export interface PushRecord {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  name: string; // whose work this device follows (a housekeeper's name), or "" for supervisors
  role: string;
  createdAt: string;
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string; // page to open when tapped
  tag?: string; // a newer message with the same tag replaces the older one
}

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

let configured: boolean | null = null;
function ready(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:housekeeping@example.com", pub, priv);
    configured = true;
  } catch (err) {
    console.error("push: bad VAPID keys", err);
    configured = false;
  }
  return configured;
}

const idFor = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex").slice(0, 32);

export function validSubscription(s: unknown): s is PushRecord["subscription"] {
  const v = s as PushRecord["subscription"];
  return (
    !!v && typeof v.endpoint === "string" && /^https:\/\//.test(v.endpoint) && v.endpoint.length < 1000 &&
    !!v.keys && typeof v.keys.p256dh === "string" && typeof v.keys.auth === "string" &&
    v.keys.p256dh.length < 200 && v.keys.auth.length < 100
  );
}

export async function saveSubscription(sub: PushRecord["subscription"], name: string, role: string): Promise<void> {
  const all = await listSubscriptions();
  // Keep each person's newest few devices; drop the oldest beyond that.
  const mine = Object.entries(all).filter(([id, r]) => r.name === name && id !== idFor(sub.endpoint))
    .sort((a, b) => b[1].createdAt.localeCompare(a[1].createdAt));
  const drop = name ? mine.slice(MAX_PER_NAME - 1).map(([id]) => ({ key: KEY, field: id, value: null })) : [];
  const rec: PushRecord = { subscription: sub, name, role, createdAt: new Date().toISOString() };
  await hashWrite([...drop, { key: KEY, field: idFor(sub.endpoint), value: JSON.stringify(rec) }]);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await hashWrite([{ key: KEY, field: idFor(endpoint), value: null }]);
}

async function listSubscriptions(): Promise<Record<string, PushRecord>> {
  const raw = await hashGetAll(KEY);
  const out: Record<string, PushRecord> = {};
  for (const [id, json] of Object.entries(raw)) {
    try { out[id] = JSON.parse(json); } catch {}
  }
  return out;
}

const SUPERVISOR = new Set(["supervisor", "frontdesk", "admin"]);

// Sends to the devices following any of `names`; `supervisors: true` also reaches supervisor
// devices. Never throws: a failed notification must not fail the save that caused it.
export async function notify(to: { names?: (string | null | undefined)[]; supervisors?: boolean }, msg: PushMessage): Promise<number> {
  if (!ready()) return 0;
  try {
    const names = new Set((to.names ?? []).filter((n): n is string => Boolean(n)));
    const subs = Object.entries(await listSubscriptions()).filter(
      ([, r]) => (r.name && names.has(r.name)) || (to.supervisors && SUPERVISOR.has(r.role)),
    );
    const payload = JSON.stringify(msg);
    const results = await Promise.allSettled(
      subs.map(([id, r]) =>
        webpush.sendNotification(r.subscription, payload, { TTL: 3600, urgency: "high", timeout: 5000 }).catch(async (err: { statusCode?: number }) => {
          // The browser dropped this subscription (app removed, permission revoked): forget it.
          if (err?.statusCode === 404 || err?.statusCode === 410) await hashWrite([{ key: KEY, field: id, value: null }]);
          throw err;
        }),
      ),
    );
    return results.filter((x) => x.status === "fulfilled").length;
  } catch (err) {
    console.error("push: notify failed", err);
    return 0;
  }
}

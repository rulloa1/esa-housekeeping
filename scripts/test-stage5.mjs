// Stage 5 end-to-end checks (notification sign-up, new-day reset) against a local dev server
// started with VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY set. Run: TEST_URL=http://localhost:3000 node scripts/test-stage5.mjs
const B = process.env.TEST_URL || "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL", m); process.exitCode = 1; } else console.log("ok", m); };
async function login(role, pin) {
  const r = await fetch(B + "/api/login", { method: "POST", body: new URLSearchParams({ role, pin }), redirect: "manual" });
  return r.headers.getSetCookie?.()[0]?.split(";")[0];
}
const j = (cookie, method, path, body) => fetch(B + path, { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
const sup = await login("supervisor", "1234");
const hk = await login("housekeeper", "1234");
await j(sup, "POST", "/api/suites", { action: "reset_baseline" });

let r = await j(hk, "GET", "/api/push");
ok(r.ok && (await r.json()).publicKey, "server offers a public key");
ok((await fetch(B + "/api/push")).status === 401, "signed-out devices can't sign up");
// An unreachable endpoint: sending fails, which must not break the save that triggers it.
// Throwaway keys made fresh on each run (a real browser makes these when a device signs up).
const { createECDH, randomBytes } = await import("node:crypto");
const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const sub = { endpoint: "https://push.invalid/test-" + Date.now(), keys: { p256dh: ecdh.getPublicKey("base64url"), auth: randomBytes(16).toString("base64url") } };
r = await j(hk, "POST", "/api/push", { subscription: sub, name: "Maria S." });
ok(r.ok && (await r.json()).name === "Maria S.", "housekeeper device follows Maria S.");
r = await j(hk, "POST", "/api/push", { subscription: sub });
ok(r.status === 400, "shared housekeeping PIN must say whose suites");
r = await j(hk, "POST", "/api/push", { subscription: { endpoint: "http://x" }, name: "A" });
ok(r.status === 400, "bad subscription refused");
r = await j(sup, "PUT", "/api/suites/120", { action: "assign", attendant: "Maria S." });
ok(r.ok, "assigning still saves when a notification can't be delivered");
r = await j(hk, "DELETE", "/api/push", { endpoint: sub.endpoint });
ok(r.ok, "device signs off");

// New-day reset: a cleaned checkout from the front-desk list becomes vacant again.
await j(sup, "POST", "/api/suites", { action: "front_desk_list", departures: "131", arrivals: "", apply: true });
await j(sup, "PUT", "/api/suites/131", { status: "clean" });
r = await fetch(B + "/api/cron/snapshot");
const cron = await r.json();
ok(r.ok && cron.suites > 0 && cron.rolledOver >= 1, `cron snapshots and resets (${cron.rolledOver} suites)`);
const s131 = await (await j(sup, "GET", "/api/suites/131")).json();
ok(s131.occ === "vacant" && s131.history[0].event === "New Day", "131 is vacant, logged as New Day");
const again = await (await fetch(B + "/api/cron/snapshot")).json();
ok(again.rolledOver === 0, "running it again changes nothing");
const man = await fetch(B + "/manifest.webmanifest");
ok(man.ok && (await man.json()).display === "standalone", "app can be added to the home screen");
ok((await fetch(B + "/sw.js")).ok && (await fetch(B + "/icon.png")).ok, "service worker and icon are served");

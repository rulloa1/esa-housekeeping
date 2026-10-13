// Stage 4 end-to-end checks (reports, departures & arrivals list) against a local dev server.
// Run: TEST_URL=http://localhost:3000 node scripts/test-stage4.mjs
const B = process.env.TEST_URL || "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL", m); process.exitCode = 1; } else console.log("ok", m); };
async function login(role, pin) {
  const r = await fetch(B + "/api/login", { method: "POST", body: new URLSearchParams({ role, pin }), redirect: "manual" });
  return r.headers.getSetCookie?.()[0]?.split(";")[0];
}
const j = (cookie, method, path, body) => fetch(B + path, { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, body: body && JSON.stringify(body), redirect: "manual" });
const sup = await login("supervisor", "1234");
const hk = await login("housekeeper", "1234");
// Start from the demo baseline so the run can be repeated (local dev store only).
await j(sup, "POST", "/api/suites", { action: "reset_baseline" });

let r = await j(sup, "POST", "/api/suites", { action: "front_desk_list", departures: "131, 999", arrivals: "131 232", apply: false });
let d = await r.json();
ok(r.ok && d.plan.length === 2 && d.invalid.includes("999") && !d.applied, "preview lists 2 suites, skips 999");
const before = await (await j(sup, "GET", "/api/suites/131")).json();
ok(before.occ !== "checkout" && before.arrivalDate === undefined, "preview changed nothing");
r = await j(sup, "POST", "/api/suites", { action: "front_desk_list", departures: "131", arrivals: "131 232", apply: true });
d = await r.json();
ok(d.applied && d.savedAs?.startsWith("before-front-desk-list-"), "apply snapshots first");
const s131 = d.docs["131"], s232 = d.docs["232"];
ok(s131.occ === "checkout" && s131.priority === "urgent" && s131.history[0].event === "Front Desk List", "131 is a same-day turn, logged");
ok(s232.priority === "high" && s232.arrivalDate, "232 arrival raised to high");
r = await j(sup, "POST", "/api/suites", { action: "front_desk_list", departures: "131", arrivals: "131 232", apply: false });
ok((await r.json()).plan.length === 0, "running the same lists again changes nothing");
r = await j(hk, "POST", "/api/suites", { action: "front_desk_list", departures: "101", apply: true });
ok(r.status === 403, "housekeepers can't apply the lists");

r = await j(sup, "GET", "/reports");
ok(r.status === 200 && (await r.text()).includes("Shift report"), "supervisor opens the report");
r = await j(hk, "GET", "/reports");
ok(r.status >= 300 && r.status < 400, "housekeeper is sent away from the report");
r = await j(sup, "GET", "/api/reports");
ok(r.ok && r.headers.get("content-type").startsWith("text/csv") && (await r.text()).includes("Suites cleaned"), "CSV downloads");
r = await j(hk, "GET", "/api/reports");
ok(r.status === 403, "housekeeper can't download the CSV");
r = await j(sup, "GET", "/api/reports?date=2001-01-01");
ok(r.status === 400, "old dates refused");

// Stage 6 end-to-end checks (photos, lost & found) against a local dev server.
// Run: TEST_URL=http://localhost:3000 node scripts/test-stage6.mjs
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

// A tiny real JPEG header is enough: the server checks the bytes, not the label.
const jpeg = "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0]).toString("base64");
let r = await j(hk, "POST", "/api/photos", { image: jpeg, userName: "Maria S." });
const { url } = await r.json();
ok(r.status === 201 && /^\/api\/photos\/[a-f0-9]{24}$/.test(url), "housekeeper uploads a photo");
r = await fetch(B + url);
ok(r.status === 401, "photos are not public");
r = await fetch(B + url, { headers: { Cookie: sup } });
ok(r.ok && r.headers.get("content-type") === "image/jpeg" && /private/.test(r.headers.get("cache-control")), "staff can view it");
r = await j(hk, "POST", "/api/photos", { image: "data:image/svg+xml;base64," + Buffer.from("<svg onload=alert(1)>").toString("base64") });
ok(r.status === 400, "SVG / non-photos refused");

r = await j(hk, "PUT", "/api/suites/121", { action: "report_maintenance", userName: "Maria S.", maintenanceIssue: { category: "Plumbing", description: "Drain slow", priority: "medium", photoUrl: url } });
let room = (await r.json()).room;
ok(room.maintenanceIssues.at(-1).photoUrl === url, "maintenance ticket keeps its photo");
r = await j(hk, "PUT", "/api/suites/121", { action: "report_maintenance", maintenanceIssue: { category: "Plumbing", description: "x", photoUrl: "https://evil.example/a.jpg" } });
room = (await r.json()).room;
ok(room.maintenanceIssues.at(-1).photoUrl === undefined, "outside photo links are dropped");
r = await j(sup, "PUT", "/api/suites/121", { action: "inspect_fail", failReasons: ["Hair in tub"], photoUrl: url });
room = (await r.json()).room;
ok(room.inspectionPhotoUrl === url && room.status === "inspection_failed", "failed inspection keeps its photo");
r = await j(sup, "PUT", "/api/suites/121", { action: "inspect_pass" });
ok((await r.json()).room.inspectionPhotoUrl === null, "passing clears the old fail photo");

r = await j(hk, "POST", "/api/lost-found", { description: "Blue phone charger", place: "Suite", suite: "214", photoUrl: url, userName: "Maria S." });
const item = (await r.json()).item;
ok(r.status === 201 && item.foundBy === "Maria S." && item.photoUrl === url, "housekeeper logs a found item");
r = await j(hk, "POST", "/api/lost-found", { description: "Ring", place: "Suite", suite: "999" });
ok(r.status === 400, "bad suite refused");
r = await j(hk, "PATCH", "/api/lost-found", { id: item.id, status: "returned" });
ok(r.status === 403, "housekeepers can't close items (server enforced)");
r = await j(sup, "PATCH", "/api/lost-found", { id: item.id, status: "returned", note: "Picked up at desk", userName: "Front Desk" });
ok(r.ok && (await r.json()).item.status === "returned", "supervisor marks it returned");
r = await j(hk, "GET", "/api/lost-found");
ok(r.ok && (await r.json()).items.some((i) => i.id === item.id && i.status === "returned"), "closed items stay in the log");
ok((await fetch(B + "/api/lost-found")).status === 401, "log is staff only");
const page = await fetch(B + "/lost-found", { headers: { Cookie: hk } });
ok(page.ok && (await page.text()).includes("Blue phone charger"), "lost & found page renders");

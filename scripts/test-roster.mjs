// Staff roster end-to-end checks against a local dev server (dev PINs 1234 / 9999).
// Run: TEST_URL=http://localhost:3000 node scripts/test-roster.mjs
const B = process.env.TEST_URL || "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL", m); process.exitCode = 1; } else console.log("ok", m); };
async function login(role, pin) {
  const r = await fetch(B + "/api/login", { method: "POST", body: new URLSearchParams({ role, pin }), redirect: "manual" });
  const c = r.headers.getSetCookie?.()[0]?.split(";")[0];
  return { cookie: c, to: r.headers.get("location") };
}
const j = (cookie, method, path, body) => fetch(B + path, { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });

const admin = (await login("admin", "9999")).cookie;
const sup = (await login("supervisor", "1234")).cookie;
const n = Date.now() % 100000;
let r = await j(admin, "POST", "/api/staff", { name: "Rosa T" + n, role: "housekeeper", pin: "5" + String(n).padStart(5, "0") });
ok(r.status === 201, "admin adds Rosa");
const rosa = (await r.json()).staff;
r = await j(admin, "POST", "/api/staff", { name: "Ana T" + n, role: "housekeeper", pin: "6" + String(n).padStart(5, "0") });
const ana = (await r.json()).staff;
ok(r.status === 201 && !("pinKey" in ana), "admin adds Ana, no PIN key in reply");
r = await j(sup, "POST", "/api/staff", { name: "Nope", role: "admin", pin: "77777" });
ok(r.status === 403, "supervisor can't add staff");
r = await j(admin, "POST", "/api/staff", { name: "Dup", role: "admin", pin: "1234" });
ok(r.status === 409, "role PIN refused as personal PIN");

const rl = await login("supervisor", "5" + String(n).padStart(5, "0"));
ok(rl.cookie?.split("=")[1].split(".").length === 4 && rl.to.endsWith("/housekeeper"), "Rosa signs in with her PIN, lands on housekeeper view");
const al = await login("housekeeper", "6" + String(n).padStart(5, "0"));

r = await j(rl.cookie, "GET", "/api/staff");
const list = (await r.json()).staff;
ok(list.every((s) => !("createdAt" in s) && s.role === "housekeeper"), "housekeeper sees names only");
r = await j(rl.cookie, "POST", "/api/staff", { name: "X", role: "admin", pin: "88881" });
ok(r.status === 403, "housekeeper can't add staff");

r = await j(sup, "PUT", "/api/suites/120", { action: "assign", attendant: rosa.name, userName: "Spoofed" });
ok(r.ok, "supervisor assigns 120 to Rosa");
r = await j(al.cookie, "PUT", "/api/suites/120", { action: "start_cleaning", attendant: ana.name });
const d = await r.json();
ok(r.status === 403 && d.reason === "notYours", "Ana can't start Rosa's suite");
r = await j(rl.cookie, "PUT", "/api/suites/120", { action: "start_cleaning", userName: "Someone Else" });
const room = (await r.json()).room;
ok(r.ok && room.history[0].by === rosa.name, "history records Rosa's real name, not the sent one");

r = await j(al.cookie, "PUT", "/api/suites/121", { action: "assign", attendant: ana.name });
r = await j(sup, "PUT", "/api/suites/121", { action: "assign", attendant: null });
r = await j(al.cookie, "PUT", "/api/suites/121", { action: "start_cleaning" });
ok(r.ok && (await r.json()).room.attendant === ana.name, "unassigned suite becomes Ana's when she starts it");

r = await j(admin, "PATCH", "/api/staff/" + rosa.id, { active: false });
ok(r.ok, "admin switches Rosa off");
r = await j(rl.cookie, "GET", "/api/suites");
ok(r.status === 401, "Rosa's open session stops working at once");
ok(!(await login("housekeeper", "5" + String(n).padStart(5, "0"))).to.includes("housekeeper"), "Rosa can't sign in again");

const page = await fetch(B + "/housekeeper", { headers: { Cookie: al.cookie } }).then((x) => x.text());
ok(page.includes("My suites:") && page.includes(ana.name), "Ana's housekeeper page shows My suites");
const rp = await fetch(B + "/roster", { headers: { Cookie: sup }, redirect: "manual" });
ok(rp.status === 307 || rp.status === 303 || rp.status === 302, "supervisor is sent away from /roster");
const rpa = await fetch(B + "/roster", { headers: { Cookie: admin } }).then((x) => x.text());
ok(rpa.includes("Staff roster") && rpa.includes(ana.name), "admin sees the roster page");
const legacy = await j(sup, "GET", "/api/suites");
ok(legacy.ok, "shared PIN sessions still work");

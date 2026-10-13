// Stage 7 end-to-end checks (handover log, sign-in activity) against a local dev server.
// Run: TEST_URL=http://localhost:3000 node scripts/test-stage7.mjs
const B = process.env.TEST_URL || "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL", m); process.exitCode = 1; } else console.log("ok", m); };
async function login(role, pin) {
  const r = await fetch(B + "/api/login", { method: "POST", body: new URLSearchParams({ role, pin }), redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" } });
  return r.headers.getSetCookie?.()[0]?.split(";")[0];
}
const j = (cookie, method, path, body) => fetch(B + path, { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
const sup = await login("supervisor", "1234");
const hk = await login("housekeeper", "1234");
const admin = await login("admin", "9999");

let r = await j(hk, "POST", "/api/handover", { text: "214 asked for extra towels at 6 PM", topic: "Guests", suite: "214", important: true, userName: "Maria S." });
const note = (await r.json()).note;
ok(r.status === 201 && note.by === "Maria S." && note.important, "housekeeper leaves an important note");
r = await j(hk, "POST", "/api/handover", { text: "" });
ok(r.status === 400, "empty note refused");
r = await j(hk, "PATCH", "/api/handover", { id: note.id, done: true });
ok(r.status === 403, "housekeepers can't mark notes handled (server enforced)");
r = await j(sup, "PATCH", "/api/handover", { id: note.id, done: true, userName: "Front Desk" });
ok(r.ok && (await r.json()).note.doneBy === "Front Desk", "supervisor marks it handled");
ok((await fetch(B + "/api/handover")).status === 401, "handover log is staff only");
let page = await fetch(B + "/handover", { headers: { Cookie: hk } });
ok(page.ok && (await page.text()).includes("extra towels"), "handover page renders");

// Wrong PIN, then check the admin's activity list.
await fetch(B + "/api/login", { method: "POST", body: new URLSearchParams({ role: "supervisor", pin: "0000" }), redirect: "manual" });
page = await fetch(B + "/roster", { headers: { Cookie: admin } });
const html = await page.text();
ok(page.ok && html.includes("Sign-in activity") && html.includes("Wrong PIN") && html.includes("iPad"), "admin sees sign-ins and the wrong PIN");
ok(!html.includes("0000") , "the wrong PIN itself is never shown");
page = await fetch(B + "/roster", { headers: { Cookie: sup }, redirect: "manual" });
ok(page.status >= 300 && page.status < 400, "non-admins can't open it");

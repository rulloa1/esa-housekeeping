// Implements the subset of window.claude.use("db") the housekeeping board uses:
//   db.collection(name).doc(id).set(body) / .delete()
//   db.collection(name).onSnapshot(onNext, onError), with snap.docs and snap.docChanges()
// backed by /api/suites, polling every few seconds so every signed-in screen stays current.
//
// Saves are safe on shaky Wi-Fi and with several devices at once:
//   - set() sends the copy the device started from along with the new one (PATCH { base, next }),
//     so the server applies only what this device changed and keeps everyone else's changes.
//   - A save that can't reach the server stays queued (also across a reload) and is retried until
//     it lands. Until then the board keeps showing it, and a small notice says it isn't saved yet.
(() => {
  const POLL_MS = 3000;
  const TIMEOUT_MS = 10000;
  const PENDING_KEY = "hk-db-pending";
  const PENDING_MAX_AGE = 24 * 3600 * 1000;
  // Aborts a request that stalls, so a hung connection can't freeze polling or a save.
  const timeout = () => {
    if (AbortSignal.timeout) return AbortSignal.timeout(TIMEOUT_MS);
    const c = new AbortController();
    setTimeout(() => c.abort(), TIMEOUT_MS);
    return c.signal;
  };
  let version = null;
  let server = {}; // suites as last read from the server
  let view = {}; // what the board sees: server plus saves still queued
  const listeners = new Set();

  const toLogin = () => { location.href = "/login"; };
  const clone = (o) => (o == null ? null : JSON.parse(JSON.stringify(o)));
  const docSnap = (id, d) => ({ id, exists: d !== undefined, data: () => d });

  function snapshot(changes) {
    return { docs: Object.entries(view).map(([id, d]) => docSnap(id, d)), docChanges: () => changes };
  }

  function diff(prev, next) {
    const changes = [];
    for (const [id, d] of Object.entries(next)) {
      if (!(id in prev)) changes.push({ type: "added", doc: docSnap(id, d) });
      else if (JSON.stringify(prev[id]) !== JSON.stringify(d)) changes.push({ type: "modified", doc: docSnap(id, d) });
    }
    for (const [id, d] of Object.entries(prev)) if (!(id in next)) changes.push({ type: "removed", doc: docSnap(id, d) });
    return changes;
  }

  // ---------- Queued saves ----------
  // id -> { next: doc | null (null = clear the suite), base: doc | null, at: ms, failed: bool }
  const pending = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
    for (const [id, p] of saved) if (p && Date.now() - p.at < PENDING_MAX_AGE) pending.set(id, p);
  } catch {}
  const storePending = () => { try { localStorage.setItem(PENDING_KEY, JSON.stringify([...pending])); } catch {} };

  // Saves that landed but aren't in a poll result yet; shown until the server's copy catches up,
  // so a poll that was already in flight can't briefly show the suite's old state.
  const landed = new Map(); // id -> { doc, version }
  function overlay() {
    const out = { ...server };
    for (const [id, l] of landed) {
      if (version !== null && version >= l.version) landed.delete(id);
      else if (l.doc === null) delete out[id];
      else out[id] = l.doc;
    }
    for (const [id, p] of pending) { if (p.next === null) delete out[id]; else out[id] = p.next; }
    return out;
  }
  function publish(force) {
    const next = overlay();
    const changes = diff(view, next);
    view = next;
    if (changes.length || force) listeners.forEach((l) => l.next(snapshot(changes)));
  }

  async function refresh() {
    const q = version === null ? "" : `?since=${version}`;
    const res = await fetch(`/api/suites${q}`, { cache: "no-store", credentials: "same-origin", signal: timeout() });
    if (res.status === 401) return toLogin();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.unchanged) return;
    const firstLoad = version === null;
    version = json.version;
    server = json.docs;
    // The first load always notifies, even when empty, so subscribers get their initial snapshot.
    publish(firstLoad);
  }

  // A failed poll ends current subscriptions through their error callback (the board
  // re-subscribes with backoff); polling itself keeps going.
  function fail(err) {
    const ls = [...listeners];
    listeners.clear();
    ls.forEach((l) => l.error && l.error(err));
  }

  let timer = null;
  function startPolling() {
    if (timer) return;
    const tick = async () => {
      try {
        await refresh();
        if (hasFailed()) retryAll(); // the connection is back: send what's queued now
      } catch (err) { fail(err); }
      timer = setTimeout(tick, document.hidden ? POLL_MS * 5 : POLL_MS);
    };
    timer = setTimeout(tick, 0);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { refresh().catch(fail); retryAll(); } });
    addEventListener("online", retryAll);
  }

  // One request chain per suite, so saves to the same suite go out in order.
  const chains = new Map();
  const enqueue = (id) => {
    const run = (chains.get(id) || Promise.resolve()).catch(() => {}).then(() => attempt(id));
    chains.set(id, run);
    return run;
  };

  function permanent(message, code) { const err = new Error(message); err.code = code; return err; }

  async function attempt(id) {
    const p = pending.get(id);
    if (!p) return;
    let res;
    try {
      res = await fetch(`/api/suites/${encodeURIComponent(id)}`, {
        method: p.next === null ? "DELETE" : "PATCH",
        credentials: "same-origin",
        signal: timeout(),
        headers: p.next === null ? undefined : { "Content-Type": "application/json" },
        body: p.next === null ? undefined : JSON.stringify({ base: p.base, next: p.next }),
      });
    } catch {
      return queued(p); // offline or timed out
    }
    if (res.status === 401) { toLogin(); throw new Error("signed out"); } // stays queued for after sign-in
    if (res.status >= 500 || res.status === 408 || res.status === 429) return queued(p);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      // The server refused this save; retrying won't change that, so drop it and say why.
      if (pending.get(id) === p) pending.delete(id);
      storePending(); publish(); showStatus();
      const reason = res.status === 403 ? json.reason || "forbidden" : "invalid";
      notice(message(reason, id, json.details));
      // Not "invalid_argument": that code would switch the whole board to read-only.
      throw permanent(`HTTP ${res.status}`, res.status === 403 ? "permission_denied" : "invalid");
    }
    landed.set(id, { doc: p.next, version: Number(json.version) || 0 });
    const newer = pending.get(id);
    if (newer === p) pending.delete(id);
    else if (newer) newer.base = clone(p.next); // later edits now build on what just landed
    storePending();
    retryDelay = 2000;
    for (const r of json.rejected || []) notice(message(r.reason, id));
    if (json.conflicts && json.conflicts.length) notice(message("conflict", id));
    showStatus(true);
    refresh().catch(fail);
  }

  function queued(p) {
    p.failed = true;
    storePending(); showStatus(); scheduleRetry();
    // Resolves: the board keeps the change on screen (it stays in the overlay) and we keep retrying.
  }

  const hasFailed = () => [...pending.values()].some((p) => p.failed);
  let retryTimer = null, retryDelay = 2000;
  function scheduleRetry() {
    if (retryTimer) return;
    retryTimer = setTimeout(() => { retryTimer = null; retryAll(); }, retryDelay);
    retryDelay = Math.min(30000, retryDelay * 2);
  }
  function retryAll() {
    clearTimeout(retryTimer); retryTimer = null;
    for (const id of pending.keys()) enqueue(id).catch(() => {});
  }

  function save(id, next) {
    const prev = pending.get(id);
    // Keep the copy this device first started from, so the server can tell what it changed.
    const base = prev ? prev.base : clone(server[id] ?? null);
    pending.set(id, { next: clone(next), base, at: Date.now(), failed: prev ? prev.failed : false });
    storePending();
    publish();
    return enqueue(id);
  }

  // ---------- Notices ----------
  const es = () => { try { return localStorage.getItem("iah-hk-lang") === "es"; } catch { return false; } };
  function message(kind, id, details) {
    const t = es() ? {
      inspect: `Solo un supervisor puede marcar la suite ${id} como inspeccionada.`,
      welfare: `Solo un supervisor puede registrar la revisión de bienestar de la suite ${id}.`,
      clearSuite: `Solo un supervisor puede borrar el registro de la suite ${id}.`,
      forbidden: `No tienes permiso para cambiar la suite ${id}.`,
      invalid: `No se pudo guardar la suite ${id}.`,
      conflict: `La suite ${id} también se cambió en otro dispositivo. Se guardaron ambos cambios.`,
    } : {
      inspect: `Only a supervisor can mark suite ${id} Inspected.`,
      welfare: `Only a supervisor can record the welfare check for suite ${id}.`,
      clearSuite: `Only a supervisor can clear suite ${id}'s record.`,
      forbidden: `You don't have permission to change suite ${id}.`,
      invalid: `Suite ${id} couldn't be saved.`,
      conflict: `Suite ${id} was also changed on another device. Both sets of changes were kept.`,
    };
    const text = t[kind] || t.forbidden;
    return kind === "invalid" && details && details.length ? `${text} ${details.join("; ")}` : text;
  }

  let box = null, noticeUntil = 0, noticeTimer = null;
  function el() {
    if (box) return box;
    box = document.createElement("div");
    box.id = "hk-db-status";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    box.setAttribute("data-noi18n", "");
    box.style.cssText = "position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:2147483000;" +
      "max-width:min(92vw,520px);padding:10px 16px;border-radius:8px;font:600 14px/1.35 Arial,Helvetica,sans-serif;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.18);display:none";
    document.body.appendChild(box);
    return box;
  }
  function paint(text, tone) {
    const b = el();
    const tones = {
      warn: ["#fff4d6", "#6b4a00", "#e0b54a"],
      error: ["#fdeceb", "#8a1c14", "#e8a19b"],
      ok: ["#e6f6ea", "#1e5e30", "#9fd3ad"],
    }[tone];
    b.style.background = tones[0]; b.style.color = tones[1]; b.style.border = `1px solid ${tones[2]}`;
    b.textContent = text;
    b.style.display = text ? "block" : "none";
  }
  // A notice (refusal, conflict) shows for a few seconds; otherwise the box shows queue state.
  function notice(text) {
    noticeUntil = Date.now() + 6000;
    paint(text, "error");
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => showStatus(), 6100);
  }
  let wasWaiting = false;
  function showStatus(justSaved) {
    if (!document.body || Date.now() < noticeUntil) return;
    const waiting = [...pending].filter(([, p]) => p.failed).map(([id]) => id);
    if (waiting.length) {
      wasWaiting = true;
      const ids = waiting.slice(0, 3).join(", ") + (waiting.length > 3 ? "…" : "");
      paint(es()
        ? `Aún no se guardó: suite${waiting.length > 1 ? "s" : ""} ${ids}. Reintentando…`
        : `Not saved yet: suite${waiting.length > 1 ? "s" : ""} ${ids}. Retrying…`, "warn");
    } else if (wasWaiting && justSaved && !pending.size) {
      wasWaiting = false;
      paint(es() ? "Todos los cambios guardados" : "All changes saved", "ok");
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { if (Date.now() >= noticeUntil && !hasFailed()) paint("", "ok"); }, 2500);
    } else if (!wasWaiting) {
      paint("", "ok");
    }
  }
  addEventListener("DOMContentLoaded", () => { if (hasFailed()) showStatus(); });

  const db = {
    collection: () => ({
      doc: (id) => ({
        set: (body) => save(id, body),
        delete: () => save(id, null),
      }),
      onSnapshot(next, error) {
        const l = { next, error };
        listeners.add(l);
        // A new subscriber gets the current data at once, with every doc reported as added.
        if (version !== null) next(snapshot(Object.entries(view).map(([id, d]) => ({ type: "added", doc: docSnap(id, d) }))));
        startPolling();
        if (pending.size) setTimeout(retryAll, 500); // saves left over from before a reload
        return () => listeners.delete(l);
      },
    }),
  };

  window.claude = Object.assign(window.claude || {}, { use: async (name) => (name === "db" ? db : null) });
})();

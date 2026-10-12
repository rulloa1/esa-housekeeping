// Implements the subset of window.claude.use("db") the housekeeping board uses:
//   db.collection(name).doc(id).set(body) / .delete()
//   db.collection(name).onSnapshot(onNext, onError), with snap.docs and snap.docChanges()
// backed by /api/suites, polling every few seconds so every signed-in screen stays current.
(() => {
  const POLL_MS = 3000;
  const TIMEOUT_MS = 10000;
  // Aborts a request that stalls, so a hung connection can't freeze polling or a save.
  const timeout = () => {
    if (AbortSignal.timeout) return AbortSignal.timeout(TIMEOUT_MS);
    const c = new AbortController();
    setTimeout(() => c.abort(), TIMEOUT_MS);
    return c.signal;
  };
  let version = null;
  let docs = {};
  const listeners = new Set();

  const toLogin = () => { location.href = "/login"; };
  const docSnap = (id, d) => ({ id, exists: d !== undefined, data: () => d });

  function snapshot(changes) {
    return { docs: Object.entries(docs).map(([id, d]) => docSnap(id, d)), docChanges: () => changes };
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

  async function refresh() {
    const q = version === null ? "" : `?since=${version}`;
    const res = await fetch(`/api/suites${q}`, { cache: "no-store", credentials: "same-origin", signal: timeout() });
    if (res.status === 401) return toLogin();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.unchanged) return;
    const changes = diff(docs, json.docs);
    const firstLoad = version === null;
    version = json.version;
    docs = json.docs;
    // The first load always notifies, even when empty, so subscribers get their initial snapshot.
    if (changes.length || firstLoad) listeners.forEach((l) => l.next(snapshot(changes)));
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
      try { await refresh(); } catch (err) { fail(err); }
      timer = setTimeout(tick, document.hidden ? POLL_MS * 5 : POLL_MS);
    };
    timer = setTimeout(tick, 0);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh().catch(fail); });
  }

  async function send(method, id, body) {
    const res = await fetch(`/api/suites/${encodeURIComponent(id)}`, {
      method,
      credentials: "same-origin",
      signal: timeout(),
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { toLogin(); throw new Error("signed out"); }
    if (!res.ok) { const err = new Error(`HTTP ${res.status}`); if (res.status === 403) err.code = "invalid_argument"; throw err; }
    refresh().catch(fail);
  }

  const db = {
    collection: () => ({
      doc: (id) => ({
        set: (body) => send("PUT", id, body),
        delete: () => send("DELETE", id),
      }),
      onSnapshot(next, error) {
        const l = { next, error };
        listeners.add(l);
        // A new subscriber gets the current data at once, with every doc reported as added.
        if (version !== null) next(snapshot(Object.entries(docs).map(([id, d]) => ({ type: "added", doc: docSnap(id, d) }))));
        startPolling();
        return () => listeners.delete(l);
      },
    }),
  };

  window.claude = Object.assign(window.claude || {}, { use: async (name) => (name === "db" ? db : null) });
})();

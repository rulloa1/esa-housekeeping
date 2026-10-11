// Implements the subset of window.claude.use("db") the housekeeping board uses:
//   db.collection(name).doc(id).set(body) / .delete()
//   db.collection(name).onSnapshot(onNext, onError)
// backed by /api/suites, polling every few seconds so every signed-in screen stays current.
(() => {
  const POLL_MS = 3000;
  let version = null;
  let docs = {};
  const listeners = new Set();

  const toLogin = () => { location.href = "/login"; };

  function emit() {
    const snap = { docs: Object.entries(docs).map(([id, d]) => ({ id, exists: true, data: () => d })) };
    listeners.forEach((l) => l.next(snap));
  }

  async function refresh() {
    const q = version === null ? "" : `?since=${version}`;
    const res = await fetch(`/api/suites${q}`, { cache: "no-store", credentials: "same-origin" });
    if (res.status === 401) return toLogin();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.unchanged) return;
    version = json.version;
    docs = json.docs;
    emit();
  }

  let timer = null;
  function startPolling() {
    if (timer) return;
    const tick = async () => {
      try { await refresh(); } catch { /* keep the last good data; retry next tick */ }
      timer = setTimeout(tick, document.hidden ? POLL_MS * 5 : POLL_MS);
    };
    tick();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh().catch(() => {}); });
  }

  async function send(method, id, body) {
    const res = await fetch(`/api/suites/${encodeURIComponent(id)}`, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { toLogin(); throw new Error("signed out"); }
    if (!res.ok) { const err = new Error(`HTTP ${res.status}`); if (res.status === 403) err.code = "invalid_argument"; throw err; }
    await refresh();
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
        if (version !== null) emit();
        startPolling();
        return () => listeners.delete(l);
      },
    }),
  };

  window.claude = Object.assign(window.claude || {}, { use: async (name) => (name === "db" ? db : null) });
})();

"use client";

import { useEffect, useState } from "react";

type Req = { type: string; at: string };

const LABEL: Record<string, string> = {
  cleaning: "Cleaning requested",
  towels: "Fresh towels requested",
  amenities: "Amenities refill requested",
  dnd_on: "Do Not Disturb turned on",
  dnd_off: "Do Not Disturb turned off",
};

const ink = "#0f172a";
const muted = "#5b6474";

// Simple line icons, drawn in white on the coloured tiles.
const icon = (d: string) => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <g dangerouslySetInnerHTML={{ __html: d }} />
  </svg>
);
const ICONS = {
  cleaning: icon('<path d="M14 3 9.5 11"/><path d="M6 12h7l2 9H4z"/><path d="M8 16v5M11 16v5"/><path d="M18 4l.6 1.4L20 6l-1.4.6L18 8l-.6-1.4L16 6l1.4-.6zM20 11l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z"/>'),
  towels: icon('<path d="M4 8c0-1.7 1.3-3 3-3h10c1.7 0 3 1.3 3 3v1H4z"/><path d="M4 9h16v3H4zM4 12h16v3H4zM4 15h16v2c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2z"/>'),
  amenities: icon('<path d="M9 7h6l1 3v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-9z"/><path d="M10 7V4h4v3M12 4V2.5"/><path d="M9.5 13h5"/>'),
  dnd: icon('<rect x="7" y="9" width="10" height="13" rx="2"/><circle cx="12" cy="5.5" r="2.5"/><circle cx="12" cy="16" r="1.4"/>'),
  home: icon('<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>'),
  list: icon('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'),
  leaf: icon('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-6 9-7"/>'),
};

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "2-digit" });
}

export default function GuestApp({ suite, k, dnd: initialDnd, initialRequests }: { suite: string; k: string; dnd: boolean; initialRequests: Req[] }) {
  const [tab, setTab] = useState<"home" | "requests">("home");
  const [dnd, setDnd] = useState(initialDnd);
  const [requests, setRequests] = useState<Req[]>(initialRequests);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [hello, setHello] = useState("Welcome");

  useEffect(() => setHello(greeting()), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function send(type: string, done: string) {
    setBusy(type);
    try {
      const res = await fetch(`/api/guest/${suite}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k, type }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setRequests(json.requests ?? []);
      if (type === "dnd_on") setDnd(true);
      if (type === "dnd_off") setDnd(false);
      setToast({ text: done, ok: true });
    } catch {
      setToast({ text: "That didn't go through. Please try again or call the front desk.", ok: false });
    } finally {
      setBusy(null);
    }
  }

  const tiles = [
    { type: "cleaning", title: "Request Cleaning", sub: "Full suite service", bg: "linear-gradient(150deg, #2c4fa3, #1d3577)", ic: ICONS.cleaning, done: "Housekeeping has your cleaning request." },
    { type: "towels", title: "Towel Refresh", sub: "Fresh towels", bg: "linear-gradient(150deg, #4a9a7a, #2f7558)", ic: ICONS.towels, done: "Fresh towels are on the way." },
    { type: "amenities", title: "Amenities Refill", sub: "Toiletries & more", bg: "linear-gradient(150deg, #6c5bd0, #4c3da6)", ic: ICONS.amenities, done: "We'll bring an amenities refill." },
    dnd
      ? { type: "dnd_off", title: "Do Not Disturb", sub: "On · tap to turn off", bg: "linear-gradient(150deg, #c2410c, #9a3412)", ic: ICONS.dnd, done: "Do Not Disturb is off. Housekeeping may stop by." }
      : { type: "dnd_on", title: "Do Not Disturb", sub: "Privacy please", bg: "linear-gradient(150deg, #f2a043, #e07d1f)", ic: ICONS.dnd, done: "Do Not Disturb is on. We won't knock." },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "#f6f7fb", color: ink, fontFamily: "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px calc(96px + env(safe-area-inset-bottom))" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 2px 10px" }}>
          <span style={{ fontSize: 12, letterSpacing: 1.1, textTransform: "uppercase", color: muted, fontWeight: 600 }}>Extended Stay America</span>
          <span style={{ fontWeight: 700, fontSize: 17 }}>Suite {suite}</span>
        </header>

        {tab === "home" ? (
          <>
            <section
              style={{
                borderRadius: 22,
                padding: "26px 22px 24px",
                background: "radial-gradient(120% 140% at 100% 0%, #e3eefc 0%, #f4f1ea 55%, #ffffff 100%)",
                boxShadow: "0 1px 2px rgba(15,23,42,.05), 0 10px 30px rgba(15,23,42,.06)",
              }}
            >
              <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.15, letterSpacing: -0.4 }}>
                {hello} <span aria-hidden="true">👋</span>
              </h1>
              <p style={{ margin: "10px 0 0", fontSize: 16, color: muted, maxWidth: 260 }}>We&apos;re here to make your stay comfortable.</p>
              {dnd && (
                <p style={{ margin: "14px 0 0", display: "inline-block", padding: "6px 12px", borderRadius: 999, background: "#fff1e6", color: "#9a3412", fontSize: 13, fontWeight: 600 }}>
                  Do Not Disturb is on
                </p>
              )}
            </section>

            <h2 style={{ margin: "26px 2px 2px", fontSize: 21 }}>Housekeeping Services</h2>
            <p style={{ margin: "0 2px 14px", color: muted }}>How can we help you today?</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {tiles.map((t) => (
                <button
                  key={t.type}
                  onClick={() => send(t.type, t.done)}
                  disabled={busy !== null}
                  style={{
                    position: "relative",
                    textAlign: "left",
                    border: 0,
                    borderRadius: 18,
                    padding: "16px 14px 14px",
                    minHeight: 150,
                    color: "#fff",
                    background: t.bg,
                    boxShadow: "0 8px 20px rgba(15,23,42,.14)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    opacity: busy && busy !== t.type ? 0.6 : 1,
                    font: "inherit",
                  }}
                >
                  {t.ic}
                  <span>
                    <span style={{ display: "block", fontSize: 18, fontWeight: 700, lineHeight: 1.2, paddingRight: 30 }}>{t.title}</span>
                    <span style={{ display: "block", fontSize: 13, opacity: 0.9, marginTop: 4 }}>{busy === t.type ? "Sending…" : t.sub}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    style={{ position: "absolute", right: 12, bottom: 14, width: 26, height: 26, borderRadius: 13, background: "rgba(255,255,255,.95)", color: "#1f2937", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700 }}
                  >
                    ›
                  </span>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "center", padding: "16px", borderRadius: 16, background: "#fff", boxShadow: "0 1px 2px rgba(15,23,42,.05)" }}>
              <span style={{ width: 40, height: 40, borderRadius: 20, background: "#e8f4ec", color: "#2f7558", display: "grid", placeItems: "center", flexShrink: 0 }}>{ICONS.leaf}</span>
              <span>
                <b style={{ display: "block", fontSize: 15 }}>Need something else?</b>
                <span style={{ color: muted, fontSize: 14 }}>Stop by or call the front desk anytime.</span>
              </span>
            </div>
          </>
        ) : (
          <section>
            <h1 style={{ margin: "8px 2px 14px", fontSize: 26 }}>Your requests</h1>
            {requests.length === 0 ? (
              <p style={{ color: muted, margin: "0 2px" }}>Nothing yet. Requests you send from Home show up here.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {requests.map((r) => (
                  <li key={r.at + r.type} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 2px rgba(15,23,42,.05)", display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <b style={{ fontWeight: 600 }}>{LABEL[r.type] ?? r.type}</b>
                    <span style={{ color: muted, fontSize: 14, whiteSpace: "nowrap" }}>{when(r.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: "calc(84px + env(safe-area-inset-bottom))",
            maxWidth: 448,
            margin: "0 auto",
            padding: "12px 16px",
            borderRadius: 14,
            background: toast.ok ? "#0f172a" : "#b42318",
            color: "#fff",
            fontSize: 15,
            boxShadow: "0 10px 30px rgba(15,23,42,.25)",
          }}
        >
          {toast.text}
        </div>
      )}

      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255,255,255,.94)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid #e5e7eb",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {(
            [
              ["home", "Home", ICONS.home],
              ["requests", "Requests", ICONS.list],
            ] as const
          ).map(([id, label, ic]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              style={{ border: 0, background: "none", padding: "10px 0 12px", display: "grid", justifyItems: "center", gap: 2, color: tab === id ? "#1d4ed8" : muted, font: "inherit", fontSize: 12, fontWeight: tab === id ? 700 : 500, cursor: "pointer" }}
            >
              {ic}
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

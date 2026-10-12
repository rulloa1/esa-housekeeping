"use client";

import { useEffect, useState } from "react";
import LangToggle from "@/components/LangToggle";
import BrandLogo from "@/components/BrandLogo";

type Req = { type: string; at: string };
type Lang = "en" | "es";

const TEXT = {
  en: {
    suite: "Suite",
    hello: ["Good morning", "Good afternoon", "Good evening"],
    welcome: "Welcome",
    intro: "We're here to make your stay comfortable.",
    dndOnBadge: "Do Not Disturb is on",
    services: "Housekeeping Services",
    help: "How can we help you today?",
    sending: "Sending…",
    cleaning: ["Request Cleaning", "Full suite service", "Housekeeping has your cleaning request."],
    towels: ["Towel Refresh", "Fresh towels", "Fresh towels are on the way."],
    amenities: ["Amenities Refill", "Toiletries & more", "We'll bring an amenities refill."],
    dndOn: ["Do Not Disturb", "Privacy please", "Do Not Disturb is on. We won't knock."],
    dndOff: ["Do Not Disturb", "On · tap to turn off", "Do Not Disturb is off. Housekeeping may stop by."],
    elseTitle: "Need something else?",
    elseBody: "Stop by or call the front desk anytime.",
    yourRequests: "Your requests",
    none: "Nothing yet. Requests you send from Home show up here.",
    failed: "That didn't go through. Please try again or call the front desk.",
    home: "Home",
    requests: "Requests",
    labels: {
      cleaning: "Cleaning requested",
      towels: "Fresh towels requested",
      amenities: "Amenities refill requested",
      dnd_on: "Do Not Disturb turned on",
      dnd_off: "Do Not Disturb turned off",
    } as Record<string, string>,
    locale: "en-US",
  },
  es: {
    suite: "Suite",
    hello: ["Buenos días", "Buenas tardes", "Buenas noches"],
    welcome: "Bienvenido",
    intro: "Estamos aquí para que tu estancia sea cómoda.",
    dndOnBadge: "No molestar está activado",
    services: "Servicios de limpieza",
    help: "¿Cómo podemos ayudarte hoy?",
    sending: "Enviando…",
    cleaning: ["Solicitar limpieza", "Limpieza completa", "Limpieza recibió tu solicitud."],
    towels: ["Cambio de toallas", "Toallas limpias", "Tus toallas limpias van en camino."],
    amenities: ["Reponer amenidades", "Artículos de aseo y más", "Te llevaremos más amenidades."],
    dndOn: ["No molestar", "Privacidad, por favor", "No molestar está activado. No tocaremos la puerta."],
    dndOff: ["No molestar", "Activado · toca para quitar", "No molestar está desactivado. Limpieza puede pasar."],
    elseTitle: "¿Necesitas algo más?",
    elseBody: "Pasa o llama a recepción cuando quieras.",
    yourRequests: "Tus solicitudes",
    none: "Aún no hay nada. Las solicitudes que envíes desde Inicio aparecen aquí.",
    failed: "No se pudo enviar. Inténtalo de nuevo o llama a recepción.",
    home: "Inicio",
    requests: "Solicitudes",
    labels: {
      cleaning: "Limpieza solicitada",
      towels: "Toallas solicitadas",
      amenities: "Amenidades solicitadas",
      dnd_on: "No molestar activado",
      dnd_off: "No molestar desactivado",
    } as Record<string, string>,
    locale: "es-US",
  },
};

const ink = "#483729";
const muted = "#7a6a5d";
const green = "#338802";

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

function greeting(lang: Lang): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const [m, a, e] = TEXT[lang].hello;
  return h < 12 ? m : h < 17 ? a : e;
}

function when(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(TEXT[lang].locale, { timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "2-digit" });
}

export default function GuestApp({ lang, suite, k, dnd: initialDnd, initialRequests }: { lang: Lang; suite: string; k: string; dnd: boolean; initialRequests: Req[] }) {
  const t = TEXT[lang];
  const [tab, setTab] = useState<"home" | "requests">("home");
  const [dnd, setDnd] = useState(initialDnd);
  const [requests, setRequests] = useState<Req[]>(initialRequests);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [hello, setHello] = useState(t.welcome);

  useEffect(() => setHello(greeting(lang)), [lang]);
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
      setToast({ text: t.failed, ok: false });
    } finally {
      setBusy(null);
    }
  }

  const tile = (type: string, [title, sub, done]: string[], bg: string, ic: React.ReactNode) => ({ type, title, sub, done, bg, ic });
  const tiles = [
    tile("cleaning", t.cleaning, "linear-gradient(150deg, #3d9a0a, #338802)", ICONS.cleaning),
    tile("towels", t.towels, "linear-gradient(150deg, #1d7006, #145E00)", ICONS.towels),
    tile("amenities", t.amenities, "linear-gradient(150deg, #6b5442, #483729)", ICONS.amenities),
    dnd
      ? tile("dnd_off", t.dndOff, "linear-gradient(150deg, #b45309, #92400e)", ICONS.dnd)
      : tile("dnd_on", t.dndOn, "linear-gradient(150deg, #e59a2e, #c97d12)", ICONS.dnd),
  ];

  return (
    <div lang={lang} style={{ minHeight: "100dvh", background: "#f5f6f4", color: ink, fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px calc(96px + env(safe-area-inset-bottom))" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 2px 10px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandLogo height={36} />
            <span style={{ fontWeight: 700, fontSize: 17 }}>{t.suite} {suite}</span>
          </span>
          <LangToggle lang={lang} />
        </header>

        {tab === "home" ? (
          <>
            <section
              style={{
                borderRadius: 4,
                padding: "26px 22px 24px",
                background: "linear-gradient(135deg, #ffffff 0%, #ffffff 55%, #eef6e8 100%)",
                borderLeft: `4px solid ${green}`,
                boxShadow: "0 1px 2px rgba(72,55,41,.08), 0 8px 24px rgba(72,55,41,.06)",
              }}
            >
              <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.15, letterSpacing: -0.4 }}>
                {hello} <span aria-hidden="true">👋</span>
              </h1>
              <p style={{ margin: "10px 0 0", fontSize: 16, color: muted, maxWidth: 260 }}>{t.intro}</p>
              {dnd && (
                <p style={{ margin: "14px 0 0", display: "inline-block", padding: "6px 12px", borderRadius: 4, background: "#fff1e0", color: "#92400e", fontSize: 13, fontWeight: 600 }}>
                  {t.dndOnBadge}
                </p>
              )}
            </section>

            <h2 style={{ margin: "26px 2px 2px", fontSize: 21 }}>{t.services}</h2>
            <p style={{ margin: "0 2px 14px", color: muted }}>{t.help}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {tiles.map((tl) => (
                <button
                  key={tl.type}
                  onClick={() => send(tl.type, tl.done)}
                  disabled={busy !== null}
                  style={{
                    position: "relative",
                    textAlign: "left",
                    border: 0,
                    borderRadius: 4,
                    padding: "16px 14px 14px",
                    minHeight: 150,
                    color: "#fff",
                    background: tl.bg,
                    boxShadow: "0 6px 16px rgba(72,55,41,.16)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    opacity: busy && busy !== tl.type ? 0.6 : 1,
                    font: "inherit",
                  }}
                >
                  {tl.ic}
                  <span>
                    <span style={{ display: "block", fontSize: 18, fontWeight: 700, lineHeight: 1.2, paddingRight: 30 }}>{tl.title}</span>
                    <span style={{ display: "block", fontSize: 13, opacity: 0.9, marginTop: 4, paddingRight: 30 }}>{busy === tl.type ? t.sending : tl.sub}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    style={{ position: "absolute", right: 12, bottom: 14, width: 26, height: 26, borderRadius: 13, background: "rgba(255,255,255,.95)", color: ink, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700 }}
                  >
                    ›
                  </span>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "center", padding: "16px", borderRadius: 4, background: "#fff", border: "1px solid #DBDEDB" }}>
              <span style={{ width: 40, height: 40, borderRadius: 20, background: "#eef6e8", color: green, display: "grid", placeItems: "center", flexShrink: 0 }}>{ICONS.leaf}</span>
              <span>
                <b style={{ display: "block", fontSize: 15 }}>{t.elseTitle}</b>
                <span style={{ color: muted, fontSize: 14 }}>{t.elseBody}</span>
              </span>
            </div>
          </>
        ) : (
          <section>
            <h1 style={{ margin: "8px 2px 14px", fontSize: 26 }}>{t.yourRequests}</h1>
            {requests.length === 0 ? (
              <p style={{ color: muted, margin: "0 2px" }}>{t.none}</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {requests.map((r) => (
                  <li key={r.at + r.type} style={{ background: "#fff", borderRadius: 4, padding: "14px 16px", border: "1px solid #DBDEDB", display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <b style={{ fontWeight: 600 }}>{t.labels[r.type] ?? r.type}</b>
                    <span style={{ color: muted, fontSize: 14, whiteSpace: "nowrap" }}>{when(r.at, lang)}</span>
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
            borderRadius: 4,
            background: toast.ok ? ink : "#b42318",
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
          borderTop: "1px solid #DBDEDB",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {(
            [
              ["home", t.home, ICONS.home],
              ["requests", t.requests, ICONS.list],
            ] as const
          ).map(([id, label, ic]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              style={{ border: 0, background: "none", padding: "10px 0 12px", display: "grid", justifyItems: "center", gap: 2, color: tab === id ? green : muted, font: "inherit", fontSize: 12, fontWeight: tab === id ? 700 : 500, cursor: "pointer" }}
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

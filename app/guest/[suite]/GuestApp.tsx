"use client";

import { useEffect, useState } from "react";
import css from "./guest.module.css";
import LangToggle from "@/components/LangToggle";
import BrandLogo from "@/components/BrandLogo";

type Req = { type: string; at: string; doneAt?: string };
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
    elseBody: "Call or stop by the front desk. Check-out is at 11 AM.",
    call: "Call",
    send: "Send request",
    more: "More for your stay",
    dndTitle: "Do Not Disturb",
    dndSubOff: "Housekeeping may stop by",
    dndSubOn: "On. We won't knock.",
    around: "Around the hotel",
    photos: ["Seasonal outdoor pool", "Full kitchen in your suite", "Free grab-and-go breakfast"],
    pending: "Sent",
    yourRequests: "Your requests",
    none: "Nothing yet. Requests you send from Home show up here.",
    failed: "That didn't go through. Please try again or call the front desk.",
    noGuest: "This suite isn't checked in right now. Please call the front desk.",
    limit: "We've received several requests from this suite. Please call the front desk.",
    done: "Done",
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
    elseBody: "Llama o pasa por recepción. La salida es a las 11 AM.",
    call: "Llamar",
    send: "Enviar solicitud",
    more: "Más para tu estancia",
    dndTitle: "No molestar",
    dndSubOff: "Limpieza puede pasar",
    dndSubOn: "Activado. No tocaremos la puerta.",
    around: "En el hotel",
    photos: ["Piscina al aire libre de temporada", "Cocina completa en tu suite", "Desayuno gratis para llevar"],
    pending: "Enviada",
    yourRequests: "Tus solicitudes",
    none: "Aún no hay nada. Las solicitudes que envíes desde Inicio aparecen aquí.",
    failed: "No se pudo enviar. Inténtalo de nuevo o llama a recepción.",
    noGuest: "Esta suite no tiene huésped registrado ahora. Llama a recepción, por favor.",
    limit: "Recibimos varias solicitudes de esta suite. Llama a recepción, por favor.",
    done: "Listo",
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
const green = "#338802";

// Simple line icons; they take the colour of their container.
const icon = (d: string, size = 26) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  phone: icon('<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>', 18),
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
      if (res.status === 409 || res.status === 429) {
        setToast({ text: res.status === 409 ? t.noGuest : t.limit, ok: false });
        return;
      }
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

  const open = requests.filter((r) => !r.doneAt && r.type !== "dnd_on" && r.type !== "dnd_off").length;
  const small = [
    { type: "towels", txt: t.towels, ic: ICONS.towels, tint: "#e7f0fb", fg: "#1f5fa8" },
    { type: "amenities", txt: t.amenities, ic: ICONS.amenities, tint: "#f3ece4", fg: ink },
  ];
  const photos = [
    ["/guest/pool.jpg", t.photos[0]],
    ["/guest/kitchen.jpg", t.photos[1]],
    ["/guest/lobby.jpg", t.photos[2]],
  ];

  return (
    <div lang={lang} className={css.page}>
      {tab === "home" ? (
        <div className={css.wrap}>
          <section className={css.hero}>
            <div className={css.topbar}>
              <span className={css.logoChip}>
                <BrandLogo height={30} />
              </span>
              <LangToggle lang={lang} style={{ borderRadius: 12, border: 0, boxShadow: "0 6px 18px rgba(0,0,0,.18)" }} />
            </div>
            <div className={css.heroText}>
              <span className={css.suiteChip}>
                {t.suite} {suite}
              </span>
              <h1 className={css.hello}>{hello}</h1>
              <p className={css.intro}>{t.intro}</p>
              {dnd && (
                <span className={css.dndBadge}>
                  <span className={css.dndDot} aria-hidden="true" />
                  {t.dndOnBadge}
                </span>
              )}
            </div>
          </section>

          <section className={css.feature} aria-labelledby="clean-title">
            <span className={css.featureImg} aria-hidden="true" />
            <span>
              <h2 id="clean-title" className={css.featureTitle}>{t.cleaning[0]}</h2>
              <p className={css.featureSub}>{t.cleaning[1]}</p>
            </span>
            <button className={css.primary} onClick={() => send("cleaning", t.cleaning[2])} disabled={busy !== null}>
              {busy === "cleaning" ? t.sending : t.send}
            </button>
          </section>

          <div className={css.pad}>
            <h2 className={css.sectionTitle}>{t.more}</h2>
            <div className={css.grid}>
              {small.map((x) => (
                <button key={x.type} className={css.tile} onClick={() => send(x.type, x.txt[2])} disabled={busy !== null}>
                  <span className={css.iconWrap} style={{ background: x.tint, color: x.fg }}>{x.ic}</span>
                  <span>
                    <span className={css.tileTitle}>{x.txt[0]}</span>
                    <span className={css.tileSub}>{busy === x.type ? t.sending : x.txt[1]}</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              className={css.row}
              role="switch"
              aria-checked={dnd}
              onClick={() => (dnd ? send("dnd_off", t.dndOff[2]) : send("dnd_on", t.dndOn[2]))}
              disabled={busy !== null}
            >
              <span className={css.iconWrap} style={{ background: "#fff4e5", color: "#c97d12" }}>{ICONS.dnd}</span>
              <span className={css.rowText}>
                <span className={css.tileTitle}>{t.dndTitle}</span>
                <span className={css.tileSub}>{busy === "dnd_on" || busy === "dnd_off" ? t.sending : dnd ? t.dndSubOn : t.dndSubOff}</span>
              </span>
              <span className={`${css.switch} ${dnd ? css.switchOn : ""}`} aria-hidden="true" />
            </button>

            <h2 className={css.sectionTitle}>{t.around}</h2>
            <div className={css.strip}>
              {photos.map(([src, label]) => (
                <div key={src} className={css.photo} style={{ backgroundImage: `url(${src})` }} role="img" aria-label={label}>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className={css.desk}>
              <span className={css.iconWrap} style={{ background: "#fff", color: green }}>{ICONS.leaf}</span>
              <span>
                <b className={css.tileTitle}>{t.elseTitle}</b>
                <span className={css.tileSub}>{t.elseBody}</span>
              </span>
              <a className={css.call} href="tel:+12819873900">
                {ICONS.phone}
                {t.call}
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className={css.wrap}>
          <header className={css.reqHead}>
            <BrandLogo height={30} />
            <LangToggle lang={lang} />
          </header>
          <section className={css.pad}>
            <h1 style={{ margin: "10px 2px 4px", fontSize: 28 }}>{t.yourRequests}</h1>
            <p style={{ margin: "0 2px 16px", color: "var(--muted)" }}>
              {t.suite} {suite}
            </p>
            {requests.length === 0 ? (
              <p className={css.empty}>{t.none}</p>
            ) : (
              <ul className={css.list}>
                {requests.map((r) => (
                  <li key={r.at + r.type} className={css.item}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b className={css.tileTitle}>{t.labels[r.type] ?? r.type}</b>
                      <span className={css.tileSub}>{when(r.at, lang)}</span>
                    </span>
                    <span className={`${css.state} ${r.doneAt || r.type.startsWith("dnd") ? css.stateDone : css.stateOpen}`}>
                      {r.doneAt || r.type.startsWith("dnd") ? t.done : t.pending}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {toast && (
        <div role="status" className={css.toast} style={{ background: toast.ok ? ink : "#b42318" }}>
          {toast.text}
        </div>
      )}

      <nav className={css.nav}>
        <div className={css.navInner}>
          {(
            [
              ["home", t.home, ICONS.home],
              ["requests", t.requests, ICONS.list],
            ] as const
          ).map(([id, label, ic]) => (
            <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`${css.navBtn} ${tab === id ? css.navOn : ""}`}>
              {ic}
              {label}
              {id === "requests" && open > 0 && <span className={css.badge}>{open}</span>}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

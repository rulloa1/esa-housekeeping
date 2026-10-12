"use client";

import { useEffect, useState, useTransition } from "react";
import LangToggle from "@/components/LangToggle";
import BrandLogo from "@/components/BrandLogo";

type Req = { type: string; at: string; doneAt?: string };
type Lang = "en" | "es";

interface GuestAppProps {
  lang: Lang;
  suite: string;
  k: string;
  dnd: boolean;
  initialRequests: Req[];
  roomType?: string;
  floor?: number;
}

const TEXT = {
  en: {
    suite: "Suite",
    floor: "Floor",
    hello: ["Good morning", "Good afternoon", "Good evening"],
    welcome: "Welcome",
    intro: "Extended Stay America Suites · Houston IAH Airport",
    subtitle: "How can our housekeeping team assist you today?",
    dndActiveTitle: "Do Not Disturb is Active",
    dndActiveDesc: "Your privacy is on. Staff will not knock or enter your suite.",
    turnOffDnd: "Turn Off Privacy",
    turnOnDnd: "Turn On Do Not Disturb",
    servicesHeading: "Housekeeping Services",
    servicesSub: "Tap any service below to request immediate assistance.",
    sending: "Sending request…",
    cleaning: {
      title: "Suite Cleaning",
      sub: "Full turnover, clean surfaces & trash removal",
      badge: "Turnover Service",
      confirm: "Housekeeping has received your cleaning request.",
    },
    towels: {
      title: "Fresh Towels",
      sub: "Plush bath towels, hand towels & bath mat",
      badge: "Fast Delivery",
      confirm: "Fresh towels have been dispatched to your suite.",
    },
    amenities: {
      title: "Amenities Refill",
      sub: "Toiletries, coffee pods & kitchenette supplies",
      badge: "Complimentary",
      confirm: "Your amenities refill request is on the way.",
    },
    dndOn: {
      title: "Do Not Disturb",
      sub: "Privacy please · Staff will not knock",
      badge: "Privacy Mode",
      confirm: "Do Not Disturb is active. We won't knock.",
    },
    dndOff: {
      title: "Privacy is On",
      sub: "Tap to turn off Do Not Disturb",
      badge: "Currently Active",
      confirm: "Do Not Disturb turned off. Housekeeping may service suite.",
    },
    quickRequest: "Quick Request",
    customOptions: "Custom Items",
    wifiTitle: "High-Speed Hotel Wi-Fi",
    wifiNetwork: "Network",
    wifiPassword: "Password",
    copyPassword: "Copy Password",
    copiedPassword: "✓ Copied!",
    amenitiesHubTitle: "Hotel Amenities & Hours",
    coffeeBreakfast: "Morning Coffee & Grab-and-Go",
    coffeeBreakfastHours: "6:00 AM – 9:30 AM · Lobby",
    laundry: "Guest Laundry Facility",
    laundryHours: "Open 24/7 · 1st Floor",
    pool: "Swimming Pool & Patio",
    poolHours: "8:00 AM – 10:00 PM Daily",
    checkoutTime: "Standard Check-Out",
    checkoutHours: "11:00 AM",
    frontDeskTitle: "Front Desk Assistance",
    frontDeskDesc: "Need fresh cookware, extra blankets, or directions?",
    frontDeskCall: "Call Front Desk (Ext. 0)",
    frontDesk247: "Staffed 24/7 on site",
    yourRequests: "Your Service Requests",
    yourRequestsSub: "Real-time tracking of requests for Suite",
    noRequestsTitle: "No Active Requests",
    noRequestsDesc: "When you request housekeeping or supplies, track live progress right here.",
    browseServices: "Browse Services",
    statusReceived: "Received",
    statusDispatched: "Dispatched",
    statusCompleted: "Completed",
    timelineReceived: "Request transmitted to front desk",
    timelineDispatched: "Housekeeper assigned to your floor",
    timelineCompleted: "Delivered to Suite",
    failed: "Unable to submit request. Please try again or call the front desk.",
    noGuest: "This suite is not currently registered as checked in. Please contact the front desk.",
    limit: "Multiple requests received recently. Please contact front desk directly.",
    home: "Home",
    requests: "Requests",
    modalTowelTitle: "Request Towel Delivery",
    modalTowelDesc: "Select the specific towels you need for Suite",
    modalAmenityTitle: "Request Amenities Refill",
    modalAmenityDesc: "Select the items you would like replenished",
    bathTowels: "Bath Towels (2x)",
    handTowels: "Hand Towels (2x)",
    washcloths: "Washcloths (2x)",
    bathMat: "Bath Mat (1x)",
    toiletriesPack: "Shampoo, Conditioner & Body Soap",
    coffeePack: "Coffee Pods, Creamer & Sugar Pack",
    kitchenPack: "Dish Soap, Sponge & Paper Towels",
    trashBags: "Extra Kitchen & Bath Trash Liners",
    submitSelected: "Submit Request",
    cancel: "Cancel",
    labels: {
      cleaning: "Full Suite Cleaning",
      towels: "Fresh Towels Delivery",
      amenities: "Amenities & Supplies Refill",
      dnd_on: "Do Not Disturb Activated",
      dnd_off: "Do Not Disturb Deactivated",
    } as Record<string, string>,
    locale: "en-US",
  },
  es: {
    suite: "Suite",
    floor: "Piso",
    hello: ["Buenos días", "Buenas tardes", "Buenas noches"],
    welcome: "Bienvenido",
    intro: "Extended Stay America Suites · Houston IAH Airport",
    subtitle: "¿Cómo puede nuestro equipo de limpieza ayudarte hoy?",
    dndActiveTitle: "No Molestar está Activado",
    dndActiveDesc: "Tu privacidad está activa. El personal no tocará ni entrará a tu suite.",
    turnOffDnd: "Desactivar Privacidad",
    turnOnDnd: "Activar No Molestar",
    servicesHeading: "Servicios de Limpieza",
    servicesSub: "Toca cualquier servicio para solicitar atención inmediata.",
    sending: "Enviando solicitud…",
    cleaning: {
      title: "Limpieza de Suite",
      sub: "Limpieza completa, superficies y retiro de basura",
      badge: "Servicio Completo",
      confirm: "Limpieza recibió tu solicitud de servicio.",
    },
    towels: {
      title: "Toallas Limpias",
      sub: "Toallas de baño suaves, de mano y tapete",
      badge: "Entrega Rápida",
      confirm: "Tus toallas limpias van en camino a tu suite.",
    },
    amenities: {
      title: "Reponer Amenidades",
      sub: "Artículos de aseo, café y suministros de cocina",
      badge: "Cortesía",
      confirm: "Tus amenidades y suministros van en camino.",
    },
    dndOn: {
      title: "No Molestar",
      sub: "Privacidad, por favor · No tocaremos la puerta",
      badge: "Modo Privacidad",
      confirm: "No Molestar está activado. No tocaremos.",
    },
    dndOff: {
      title: "Privacidad Activada",
      sub: "Toca para desactivar No Molestar",
      badge: "Actualmente Activo",
      confirm: "No Molestar desactivado. Limpieza puede pasar.",
    },
    quickRequest: "Solicitud Rápida",
    customOptions: "Elegir Artículos",
    wifiTitle: "Wi-Fi de Alta Velocidad",
    wifiNetwork: "Red",
    wifiPassword: "Clave",
    copyPassword: "Copiar Clave",
    copiedPassword: "✓ ¡Copiada!",
    amenitiesHubTitle: "Horarios y Amenidades del Hotel",
    coffeeBreakfast: "Café Matutino y Desayuno Grab-and-Go",
    coffeeBreakfastHours: "6:00 AM – 9:30 AM · Lobby",
    laundry: "Lavandería para Huéspedes",
    laundryHours: "Abierto 24/7 · 1er Piso",
    pool: "Piscina y Patio Exterior",
    poolHours: "8:00 AM – 10:00 PM Diario",
    checkoutTime: "Salida del Hotel (Check-Out)",
    checkoutHours: "11:00 AM",
    frontDeskTitle: "Atención en Recepción",
    frontDeskDesc: "¿Necesitas utensilios de cocina, cobijas extra o indicaciones?",
    frontDeskCall: "Llamar a Recepción (Ext. 0)",
    frontDesk247: "Personal 24/7 en sitio",
    yourRequests: "Tus Solicitudes de Servicio",
    yourRequestsSub: "Seguimiento en tiempo real para Suite",
    noRequestsTitle: "Sin Solicitudes Activas",
    noRequestsDesc: "Cuando pidas toallas o limpieza, podrás ver el progreso en vivo aquí.",
    browseServices: "Ver Servicios",
    statusReceived: "Recibido",
    statusDispatched: "Despachado",
    statusCompleted: "Completado",
    timelineReceived: "Solicitud recibida en el sistema",
    timelineDispatched: "Camarista asignada a tu piso",
    timelineCompleted: "Entregado en tu Suite",
    failed: "No se pudo enviar la solicitud. Intenta de nuevo o llama a recepción.",
    noGuest: "Esta suite no figura como registrada. Comunícate con recepción.",
    limit: "Se recibieron varias solicitudes recientes. Llama a recepción, por favor.",
    home: "Inicio",
    requests: "Solicitudes",
    modalTowelTitle: "Solicitar Entrega de Toallas",
    modalTowelDesc: "Selecciona las toallas específicas para la Suite",
    modalAmenityTitle: "Solicitar Reposición de Amenidades",
    modalAmenityDesc: "Selecciona los artículos que necesitas reponer",
    bathTowels: "Toallas de Baño (2x)",
    handTowels: "Toallas de Mano (2x)",
    washcloths: "Toallas Faciales (2x)",
    bathMat: "Tapete de Baño (1x)",
    toiletriesPack: "Shampoo, Acondicionador y Jabón",
    coffeePack: "Cápsulas de Café, Crema y Azúcar",
    kitchenPack: "Jabón de Trastes, Esponja y Toallas de Papel",
    trashBags: "Bolsas de Basura para Cocina y Baño",
    submitSelected: "Confirmar Solicitud",
    cancel: "Cancelar",
    labels: {
      cleaning: "Limpieza Completa de Suite",
      towels: "Entrega de Toallas Limpias",
      amenities: "Reposición de Amenidades y Cocina",
      dnd_on: "No Molestar Activado",
      dnd_off: "No Molestar Desactivado",
    } as Record<string, string>,
    locale: "es-US",
  },
};

function greeting(lang: Lang): string {
  const h = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" }).format(new Date())
  );
  const [m, a, e] = TEXT[lang].hello;
  return h < 12 ? m : h < 17 ? a : e;
}

function formatTime(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleTimeString(TEXT[lang].locale, {
      timeZone: "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function GuestApp({
  lang,
  suite,
  k,
  dnd: initialDnd,
  initialRequests,
  roomType = "King Suite",
  floor = 2,
}: GuestAppProps) {
  const t = TEXT[lang];
  const [tab, setTab] = useState<"home" | "requests">("home");
  const [dnd, setDnd] = useState(initialDnd);
  const [requests, setRequests] = useState<Req[]>(initialRequests);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [hello, setHello] = useState(t.welcome);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [customModal, setCustomModal] = useState<"towels" | "amenities" | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setHello(greeting(lang));
  }, [lang]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const copyWifiPassword = async () => {
    try {
      await navigator.clipboard.writeText("HoustonStay2026");
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2400);
    } catch {
      // Fallback
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2400);
    }
  };

  async function send(type: string, doneMessage: string) {
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
      startTransition(() => {
        setRequests(json.requests ?? []);
        if (type === "dnd_on") setDnd(true);
        if (type === "dnd_off") setDnd(false);
      });
      setToast({ text: doneMessage, ok: true });
    } catch {
      setToast({ text: t.failed, ok: false });
    } finally {
      setBusy(null);
      setCustomModal(null);
    }
  }

  const activeRequestsCount = requests.filter((r) => !r.doneAt && r.type !== "dnd_on" && r.type !== "dnd_off").length;

  return (
    <div
      lang={lang}
      style={{
        minHeight: "100dvh",
        backgroundColor: "#FBF9F5",
        color: "#2C2016",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .guest-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .guest-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(44, 32, 22, 0.11);
        }
        .guest-card:active {
          transform: scale(0.98);
        }
        .tile-btn {
          transition: transform 0.16s ease, filter 0.16s ease;
        }
        .tile-btn:active {
          transform: scale(0.97);
        }
        .fade-in {
          animation: fadeIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Main Container */}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 16px calc(96px + env(safe-area-inset-bottom))" }}>
        {/* Top Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 4px 12px",
            borderBottom: "1px solid #EBE5DB",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandLogo height={34} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "#827263", textTransform: "uppercase" }}>
                Houston IAH Airport
              </span>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#2C2016" }}>
                {t.suite} {suite}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LangToggle lang={lang} />
          </div>
        </header>

        {tab === "home" ? (
          <div className="fade-in">
            {/* Signature Property Hero Banner */}
            <section
              style={{
                position: "relative",
                borderRadius: 18,
                overflow: "hidden",
                color: "#FFFFFF",
                boxShadow: "0 10px 30px rgba(44, 32, 22, 0.16)",
                marginBottom: 20,
                backgroundImage:
                  'linear-gradient(180deg, rgba(28, 22, 18, 0.42) 0%, rgba(28, 22, 18, 0.90) 100%), url("/banners/suite-king.jpg")',
                backgroundSize: "cover",
                backgroundPosition: "center 45%",
                padding: "44px 22px 24px",
              }}
            >
              {/* Hotel Pill */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 20,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                <span>★</span> {roomType} · {t.floor} {floor}
              </div>

              <h1
                style={{
                  margin: "0 0 6px",
                  fontSize: 27,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  letterSpacing: -0.4,
                  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                {hello} <span aria-hidden="true">👋</span>
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 14.5,
                  color: "rgba(255, 255, 255, 0.92)",
                  lineHeight: 1.45,
                  maxWidth: 380,
                }}
              >
                {t.subtitle}
              </p>

              {/* DND Status Highlight Inside Hero */}
              {dnd && (
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 10,
                    backgroundColor: "rgba(180, 83, 9, 0.88)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(254, 215, 170, 0.4)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🔕</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>{t.dndActiveTitle}</span>
                  </div>
                  <button
                    id="btn-guest-hero-dnd-off"
                    type="button"
                    onClick={() => send("dnd_off", t.dndOff.confirm)}
                    disabled={busy !== null}
                    style={{
                      background: "#FFFFFF",
                      color: "#92400E",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {t.turnOffDnd}
                  </button>
                </div>
              )}
            </section>

            {/* Services Section Header */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: "0 0 2px", fontSize: 19, fontWeight: 800, color: "#2C2016", letterSpacing: -0.3 }}>
                  {t.servicesHeading}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#827263" }}>{t.servicesSub}</p>
              </div>
            </div>

            {/* 4 Core Action Tiles Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {/* 1. Room Cleaning Tile */}
              <div
                className="guest-card"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  border: "1px solid #EBE5DB",
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 165,
                  position: "relative",
                  boxShadow: "0 2px 8px rgba(44, 32, 22, 0.05)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #2F7A1E, #1E5713)",
                        color: "#FFFFFF",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 20,
                        boxShadow: "0 4px 10px rgba(47, 122, 30, 0.28)",
                      }}
                    >
                      🧹
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: "#2F7A1E",
                        backgroundColor: "#EAF4E6",
                        padding: "3px 7px",
                        borderRadius: 12,
                      }}
                    >
                      {t.cleaning.badge}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#2C2016" }}>
                    {t.cleaning.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#5C4B3C", lineHeight: 1.35 }}>
                    {t.cleaning.sub}
                  </p>
                </div>

                <button
                  id="btn-guest-request-cleaning"
                  type="button"
                  className="tile-btn"
                  onClick={() => send("cleaning", t.cleaning.confirm)}
                  disabled={busy !== null}
                  style={{
                    marginTop: 12,
                    backgroundColor: "#2F7A1E",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    opacity: busy === "cleaning" ? 0.7 : 1,
                  }}
                >
                  {busy === "cleaning" ? t.sending : t.quickRequest} →
                </button>
              </div>

              {/* 2. Towel Refresh Tile */}
              <div
                className="guest-card"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  border: "1px solid #EBE5DB",
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 165,
                  position: "relative",
                  boxShadow: "0 2px 8px rgba(44, 32, 22, 0.05)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                        color: "#FFFFFF",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 20,
                        boxShadow: "0 4px 10px rgba(37, 99, 235, 0.28)",
                      }}
                    >
                      🧺
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: "#2563EB",
                        backgroundColor: "#EFF6FF",
                        padding: "3px 7px",
                        borderRadius: 12,
                      }}
                    >
                      {t.towels.badge}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#2C2016" }}>
                    {t.towels.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#5C4B3C", lineHeight: 1.35 }}>
                    {t.towels.sub}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <button
                    id="btn-guest-request-towels-quick"
                    type="button"
                    className="tile-btn"
                    onClick={() => send("towels", t.towels.confirm)}
                    disabled={busy !== null}
                    style={{
                      flex: 1,
                      backgroundColor: "#2563EB",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 8px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      opacity: busy === "towels" ? 0.7 : 1,
                    }}
                  >
                    {busy === "towels" ? t.sending : t.quickRequest}
                  </button>
                  <button
                    id="btn-guest-towels-options"
                    type="button"
                    onClick={() => setCustomModal("towels")}
                    title="Choose specific items"
                    style={{
                      backgroundColor: "#EFF6FF",
                      color: "#2563EB",
                      border: "1px solid #BFDBFE",
                      borderRadius: 8,
                      padding: "9px 10px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    ⚙️
                  </button>
                </div>
              </div>

              {/* 3. Amenities Refill Tile */}
              <div
                className="guest-card"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  border: "1px solid #EBE5DB",
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 165,
                  position: "relative",
                  boxShadow: "0 2px 8px rgba(44, 32, 22, 0.05)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #4A3728, #332418)",
                        color: "#FFFFFF",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 20,
                        boxShadow: "0 4px 10px rgba(74, 55, 40, 0.28)",
                      }}
                    >
                      🧴
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: "#4A3728",
                        backgroundColor: "#F6EFE5",
                        padding: "3px 7px",
                        borderRadius: 12,
                      }}
                    >
                      {t.amenities.badge}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#2C2016" }}>
                    {t.amenities.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#5C4B3C", lineHeight: 1.35 }}>
                    {t.amenities.sub}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <button
                    id="btn-guest-request-amenities-quick"
                    type="button"
                    className="tile-btn"
                    onClick={() => send("amenities", t.amenities.confirm)}
                    disabled={busy !== null}
                    style={{
                      flex: 1,
                      backgroundColor: "#4A3728",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 8px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      opacity: busy === "amenities" ? 0.7 : 1,
                    }}
                  >
                    {busy === "amenities" ? t.sending : t.quickRequest}
                  </button>
                  <button
                    id="btn-guest-amenities-options"
                    type="button"
                    onClick={() => setCustomModal("amenities")}
                    title="Choose specific items"
                    style={{
                      backgroundColor: "#F6EFE5",
                      color: "#4A3728",
                      border: "1px solid #DDD5C8",
                      borderRadius: 8,
                      padding: "9px 10px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    ⚙️
                  </button>
                </div>
              </div>

              {/* 4. Do Not Disturb Tile */}
              <div
                className="guest-card"
                style={{
                  backgroundColor: dnd ? "#FFFBEB" : "#FFFFFF",
                  borderRadius: 14,
                  border: dnd ? "1.5px solid #FCD34D" : "1px solid #EBE5DB",
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 165,
                  position: "relative",
                  boxShadow: "0 2px 8px rgba(44, 32, 22, 0.05)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: dnd ? "linear-gradient(135deg, #D97706, #B45309)" : "linear-gradient(135deg, #78716C, #57534E)",
                        color: "#FFFFFF",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 20,
                        boxShadow: "0 4px 10px rgba(217, 119, 6, 0.28)",
                      }}
                    >
                      {dnd ? "🔕" : "🔔"}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: dnd ? "#B45309" : "#57534E",
                        backgroundColor: dnd ? "#FEF3C7" : "#F5F5F4",
                        padding: "3px 7px",
                        borderRadius: 12,
                      }}
                    >
                      {dnd ? t.dndOff.badge : t.dndOn.badge}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: dnd ? "#92400E" : "#2C2016" }}>
                    {dnd ? t.dndOff.title : t.dndOn.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#5C4B3C", lineHeight: 1.35 }}>
                    {dnd ? t.dndOff.sub : t.dndOn.sub}
                  </p>
                </div>

                <button
                  id="btn-guest-toggle-dnd"
                  type="button"
                  className="tile-btn"
                  onClick={() => (dnd ? send("dnd_off", t.dndOff.confirm) : send("dnd_on", t.dndOn.confirm))}
                  disabled={busy !== null}
                  style={{
                    marginTop: 12,
                    backgroundColor: dnd ? "#D97706" : "#4A3728",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    opacity: busy === "dnd_on" || busy === "dnd_off" ? 0.7 : 1,
                  }}
                >
                  {busy === "dnd_on" || busy === "dnd_off"
                    ? t.sending
                    : dnd
                    ? `✓ ${t.turnOffDnd}`
                    : t.turnOnDnd}
                </button>
              </div>
            </div>

            {/* High-Speed Wi-Fi Card */}
            <div
              className="guest-card"
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                border: "1px solid #EBE5DB",
                padding: "16px 18px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                boxShadow: "0 2px 6px rgba(44, 32, 22, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: "#EAF4E6",
                    color: "#2F7A1E",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  📶
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#2C2016" }}>{t.wifiTitle}</div>
                  <div style={{ fontSize: 12.5, color: "#5C4B3C", marginTop: 2 }}>
                    <span>{t.wifiNetwork}: <b>ESA-Guest</b></span>
                    <span style={{ margin: "0 6px" }}>•</span>
                    <span>{t.wifiPassword}: <b>HoustonStay2026</b></span>
                  </div>
                </div>
              </div>

              <button
                id="btn-guest-wifi-copy"
                type="button"
                onClick={copyWifiPassword}
                style={{
                  backgroundColor: copiedWifi ? "#2F7A1E" : "#F6EFE5",
                  color: copiedWifi ? "#FFFFFF" : "#4A3728",
                  border: "1px solid #DDD5C8",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                {copiedWifi ? t.copiedPassword : t.copyPassword}
              </button>
            </div>

            {/* Hotel Amenities & Schedules Guide Card */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                border: "1px solid #EBE5DB",
                padding: "18px 20px",
                marginBottom: 16,
                boxShadow: "0 2px 6px rgba(44, 32, 22, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 18 }}>🏨</span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#2C2016" }}>
                  {t.amenitiesHubTitle}
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ backgroundColor: "#FBF9F5", padding: "10px 12px", borderRadius: 8, border: "1px solid #F3ECE2" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2C2016" }}>☕ {t.coffeeBreakfast}</div>
                  <div style={{ fontSize: 11.5, color: "#827263", marginTop: 3 }}>{t.coffeeBreakfastHours}</div>
                </div>

                <div style={{ backgroundColor: "#FBF9F5", padding: "10px 12px", borderRadius: 8, border: "1px solid #F3ECE2" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2C2016" }}>🧺 {t.laundry}</div>
                  <div style={{ fontSize: 11.5, color: "#827263", marginTop: 3 }}>{t.laundryHours}</div>
                </div>

                <div style={{ backgroundColor: "#FBF9F5", padding: "10px 12px", borderRadius: 8, border: "1px solid #F3ECE2" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2C2016" }}>🏊 {t.pool}</div>
                  <div style={{ fontSize: 11.5, color: "#827263", marginTop: 3 }}>{t.poolHours}</div>
                </div>

                <div style={{ backgroundColor: "#FBF9F5", padding: "10px 12px", borderRadius: 8, border: "1px solid #F3ECE2" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2C2016" }}>🔑 {t.checkoutTime}</div>
                  <div style={{ fontSize: 11.5, color: "#827263", marginTop: 3 }}>{t.checkoutHours}</div>
                </div>
              </div>
            </div>

            {/* Front Desk Direct Connect */}
            <div
              style={{
                backgroundColor: "#F6EFE5",
                borderRadius: 14,
                border: "1px solid #DDD5C8",
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "#2C2016" }}>{t.frontDeskTitle}</div>
                <div style={{ fontSize: 12.5, color: "#5C4B3C", marginTop: 2 }}>{t.frontDeskDesc}</div>
                <div style={{ fontSize: 11.5, color: "#2F7A1E", fontWeight: 700, marginTop: 4 }}>
                  🟢 {t.frontDesk247}
                </div>
              </div>

              <a
                id="btn-guest-call-front-desk"
                href="tel:+18325550199"
                style={{
                  backgroundColor: "#4A3728",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                📞 {t.frontDeskCall}
              </a>
            </div>
          </div>
        ) : (
          /* Requests History & Live Tracking Tab */
          <div className="fade-in">
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: "#2C2016" }}>
                {t.yourRequests}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#827263" }}>
                {t.yourRequestsSub} <b>{suite}</b>
              </p>
            </div>

            {requests.length === 0 ? (
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  border: "1px solid #EBE5DB",
                  padding: "48px 24px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(44, 32, 22, 0.05)",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    backgroundColor: "#F6EFE5",
                    color: "#4A3728",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 26,
                    margin: "0 auto 16px",
                  }}
                >
                  📋
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#2C2016" }}>
                  {t.noRequestsTitle}
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#5C4B3C", maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
                  {t.noRequestsDesc}
                </p>
                <button
                  id="btn-guest-browse-services-empty"
                  type="button"
                  onClick={() => setTab("home")}
                  style={{
                    backgroundColor: "#2F7A1E",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 18px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {t.browseServices} →
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {requests.map((r, idx) => {
                  const isDone = Boolean(r.doneAt);
                  const isDnd = r.type === "dnd_on" || r.type === "dnd_off";

                  return (
                    <div
                      key={r.at + r.type + idx}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 14,
                        border: "1px solid #EBE5DB",
                        padding: "16px 18px",
                        boxShadow: "0 2px 6px rgba(44, 32, 22, 0.04)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>
                            {r.type === "cleaning"
                              ? "🧹"
                              : r.type === "towels"
                              ? "🧺"
                              : r.type === "amenities"
                              ? "🧴"
                              : r.type === "dnd_on"
                              ? "🔕"
                              : "🔔"}
                          </span>
                          <div>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#2C2016" }}>
                              {t.labels[r.type] || r.type}
                            </h4>
                            <span style={{ fontSize: 12, color: "#827263" }}>
                              {formatTime(r.at, lang)}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 9px",
                            borderRadius: 12,
                            backgroundColor: isDone ? "#ECFDF5" : isDnd ? "#F5F5F4" : "#EFF6FF",
                            color: isDone ? "#059669" : isDnd ? "#57534E" : "#2563EB",
                            border: `1px solid ${isDone ? "#A7F3D0" : isDnd ? "#E5E7EB" : "#BFDBFE"}`,
                          }}
                        >
                          {isDone ? `✓ ${t.statusCompleted}` : isDnd ? t.statusCompleted : t.statusDispatched}
                        </span>
                      </div>

                      {/* Visual 3-Step Progress Stepper for operational tasks */}
                      {!isDnd && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: "1px solid #F3ECE2",
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 6,
                            textAlign: "center",
                          }}
                        >
                          <div>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2F7A1E", margin: "0 auto 4px" }} />
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#2F7A1E" }}>{t.statusReceived}</div>
                            <div style={{ fontSize: 9.5, color: "#827263" }}>{formatTime(r.at, lang)}</div>
                          </div>
                          <div>
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: isDone ? "#2F7A1E" : "#2563EB",
                                margin: "0 auto 4px",
                              }}
                            />
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: isDone ? "#2F7A1E" : "#2563EB" }}>
                              {t.statusDispatched}
                            </div>
                            <div style={{ fontSize: 9.5, color: "#827263" }}>{isDone ? "✓" : "En route"}</div>
                          </div>
                          <div>
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: isDone ? "#059669" : "#DDD5C8",
                                margin: "0 auto 4px",
                              }}
                            />
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: isDone ? "#059669" : "#827263" }}>
                              {t.statusCompleted}
                            </div>
                            <div style={{ fontSize: 9.5, color: "#827263" }}>
                              {r.doneAt ? formatTime(r.doneAt, lang) : "Pending"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customization Bottom Sheet Modal */}
      {customModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(28, 22, 18, 0.6)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              width: "100%",
              maxWidth: 520,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: "24px 20px calc(24px + env(safe-area-inset-bottom))",
              boxShadow: "0 -10px 30px rgba(0,0,0,0.2)",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{customModal === "towels" ? "🧺" : "🧴"}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#2C2016" }}>
                    {customModal === "towels" ? t.modalTowelTitle : t.modalAmenityTitle}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#827263" }}>
                    {customModal === "towels" ? t.modalTowelDesc : t.modalAmenityDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomModal(null)}
                style={{
                  background: "#F3ECE2",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#2C2016",
                }}
              >
                ✕
              </button>
            </div>

            {/* Checkable Quick Items */}
            <div style={{ display: "grid", gap: 10, margin: "18px 0 22px" }}>
              {(customModal === "towels"
                ? [t.bathTowels, t.handTowels, t.washcloths, t.bathMat]
                : [t.toiletriesPack, t.coffeePack, t.kitchenPack, t.trashBags]
              ).map((item, idx) => (
                <label
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    backgroundColor: "#FBF9F5",
                    border: "1px solid #EBE5DB",
                    cursor: "pointer",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "#2C2016",
                  }}
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{ width: 18, height: 18, accentColor: "#2F7A1E" }}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => setCustomModal(null)}
                style={{
                  backgroundColor: "#F3ECE2",
                  color: "#4A3728",
                  border: "none",
                  borderRadius: 10,
                  padding: "13px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t.cancel}
              </button>
              <button
                id="btn-guest-submit-modal"
                type="button"
                onClick={() =>
                  customModal === "towels"
                    ? send("towels", t.towels.confirm)
                    : send("amenities", t.amenities.confirm)
                }
                disabled={busy !== null}
                style={{
                  backgroundColor: "#2F7A1E",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 10,
                  padding: "13px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {busy !== null ? t.sending : `✓ ${t.submitSelected}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: "calc(80px + env(safe-area-inset-bottom))",
            maxWidth: 440,
            margin: "0 auto",
            padding: "13px 18px",
            borderRadius: 12,
            backgroundColor: toast.ok ? "#2C2016" : "#B91C1C",
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.28)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 90,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span style={{ fontSize: 18 }}>{toast.ok ? "✓" : "⚠️"}</span>
          <span style={{ flex: 1 }}>{toast.text}</span>
        </div>
      )}

      {/* Bottom Sticky Navigation */}
      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid #EBE5DB",
          paddingBottom: "env(safe-area-inset-bottom)",
          zIndex: 80,
          boxShadow: "0 -4px 16px rgba(44, 32, 22, 0.05)",
        }}
      >
        <div style={{ maxWidth: 520, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <button
            id="btn-guest-tab-home"
            type="button"
            onClick={() => setTab("home")}
            aria-current={tab === "home" ? "page" : undefined}
            style={{
              border: 0,
              background: "none",
              padding: "10px 0 12px",
              display: "grid",
              justifyItems: "center",
              gap: 3,
              color: tab === "home" ? "#2F7A1E" : "#827263",
              font: "inherit",
              fontSize: 12,
              fontWeight: tab === "home" ? 800 : 500,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 20 }}>🏠</span>
            {t.home}
          </button>

          <button
            id="btn-guest-tab-requests"
            type="button"
            onClick={() => setTab("requests")}
            aria-current={tab === "requests" ? "page" : undefined}
            style={{
              border: 0,
              background: "none",
              padding: "10px 0 12px",
              display: "grid",
              justifyItems: "center",
              gap: 3,
              color: tab === "requests" ? "#2F7A1E" : "#827263",
              font: "inherit",
              fontSize: 12,
              fontWeight: tab === "requests" ? 800 : 500,
              cursor: "pointer",
              position: "relative",
            }}
          >
            <div style={{ position: "relative" }}>
              <span style={{ fontSize: 20 }}>📋</span>
              {activeRequestsCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -10,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: "#2563EB",
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: 800,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {activeRequestsCount}
                </span>
              )}
            </div>
            {t.requests}
          </button>
        </div>
      </nav>
    </div>
  );
}

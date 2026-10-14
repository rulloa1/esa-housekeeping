import { ROLES, type Role } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { BrandLogo } from "@/components/BrandLogo";
import { LangToggle } from "@/components/LangToggle";
import { LoginForm } from "@/components/LoginForm";
import { BRAND } from "@/lib/brand";

const TEXT = {
  en: {
    signIn: "Sign in",
    mockup: `Concept mock-up for ${BRAND.name}. Internal operations portal. ©`,
    role: "Role",
    pin: "Staff PIN",
    error: "That PIN didn't match. Try again.",
    locked: (min: number) => `Too many wrong PINs from this device. Try again in ${min} minute${min === 1 ? "" : "s"}.`,
    pinPlaceholder: "Enter PIN",
    roles: {
      housekeeper: "Housekeeper",
      supervisor: "Supervisor",
      admin: "Administrator",
    },
  },
  es: {
    signIn: "Iniciar sesión",
    mockup: `Prototipo conceptual para ${BRAND.name}. Portal de operaciones internas. ©`,
    role: "Puesto",
    pin: "PIN del personal",
    error: "Ese PIN no coincide. Inténtalo de nuevo.",
    locked: (min: number) => `Demasiados PIN incorrectos desde este dispositivo. Inténtalo de nuevo en ${min} minuto${min === 1 ? "" : "s"}.`,
    pinPlaceholder: "Ingresar PIN",
    roles: {
      housekeeper: "Limpieza / Housekeeping",
      supervisor: "Supervisor / Recepción",
      admin: "Administrador",
    },
  },
};

import { cookies } from "next/headers";
import { getHotelConfig, HOTEL_CONFIG } from "@/hotel.config";

const SHADE = "linear-gradient(rgba(10, 20, 35, 0.40), rgba(10, 20, 35, 0.65))";
const FALLBACK = "linear-gradient(160deg, #1d3c5e 0%, #3f6f93 55%, #c9d8e4 100%)";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; wait?: string }> }) {
  const { error, wait } = await searchParams;
  const lang = await getLang();
  const t = TEXT[lang];

  const cookieStore = await cookies();
  const presetId = cookieStore.get("hotel_preset")?.value;
  const hotel = presetId ? getHotelConfig(presetId) : HOTEL_CONFIG;

  const heroImg = hotel.photos?.hero || "/login-bg.jpg";
  const heroPortraitImg = hotel.photos?.heroPortrait || heroImg;
  const dynamicBackgroundCss = `
    .login-bg { background: ${SHADE}, url(${heroImg}) center / cover no-repeat, ${FALLBACK}; }
    @media (orientation: portrait) {
      .login-bg { background: ${SHADE}, url(${heroPortraitImg}) center / cover no-repeat, ${FALLBACK}; }
    }
  `;

  return (
    <div
      className="login-bg"
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: 16,
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <style>{dynamicBackgroundCss}</style>
      <LangToggle lang={lang} style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }} />

      <main
        lang={lang}
        style={{
          width: "100%",
          maxWidth: 400,
          boxSizing: "border-box",
          padding: "32px 28px",
          borderRadius: 14,
          borderTop: `4px solid ${hotel.theme.primary}`,
          background: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
          color: "#2C2016",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <BrandLogo height={44} />
          <p style={{ margin: "10px 0 0", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, color: hotel.theme.accent }}>
            {hotel.location}
          </p>
          <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "#2C2016" }}>
            {t.signIn}
          </h1>
        </div>

        <LoginForm
          roles={t.roles}
          signInText={t.signIn}
          roleText={t.role}
          pinText={t.pin}
          pinPlaceholder={t.pinPlaceholder}
          errorMessage={error ? (error === "locked" ? t.locked(Math.max(1, Number(wait) || 15)) : t.error) : undefined}
        />

        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid #EBE5DB", textAlign: "center", fontSize: 12, color: "#827263" }}>
          {BRAND.name} Operations
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 11, lineHeight: 1.45, textAlign: "center", color: "#8a7a6b" }}>
          {t.mockup} <a href="https://theroyeffect.com" style={{ color: "inherit" }}>theroyeffect.com</a>
        </p>
      </main>
    </div>
  );
}

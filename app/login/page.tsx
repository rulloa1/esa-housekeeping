import { ROLES, type Role } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { BrandLogo } from "@/components/BrandLogo";
import { LangToggle } from "@/components/LangToggle";
import { LoginForm } from "@/components/LoginForm";

const TEXT = {
  en: {
    signIn: "Sign in",
    mockup: "Concept mock-up. Not an official Extended Stay America or J&P Asset Management site. ©",
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
    mockup: "Prototipo conceptual. No es un sitio oficial de Extended Stay America ni de J&P Asset Management. ©",
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

const SHADE = "linear-gradient(rgba(10, 20, 35, 0.35), rgba(10, 20, 35, 0.55))";
const FALLBACK = "linear-gradient(160deg, #1d3c5e 0%, #3f6f93 55%, #c9d8e4 100%)";
const BACKGROUND_CSS = `
.login-bg { background: ${SHADE}, url(/login-bg.jpg) center / cover no-repeat, ${FALLBACK}; }
@media (orientation: portrait) {
  .login-bg { background: ${SHADE}, url(/login-bg-portrait.jpg) center / cover no-repeat, ${FALLBACK}; }
}`;

const field = {
  padding: "12px 14px",
  fontSize: "15px",
  borderRadius: "8px",
  border: "1px solid #DDD5C8",
  background: "#FFFFFF",
  color: "#2C2016",
  fontFamily: "inherit",
  outline: "none",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; wait?: string }> }) {
  const { error, wait } = await searchParams;
  const lang = await getLang();
  const t = TEXT[lang];

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
      <style>{BACKGROUND_CSS}</style>
      <LangToggle lang={lang} style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }} />

      <main
        lang={lang}
        style={{
          width: "100%",
          maxWidth: 400,
          boxSizing: "border-box",
          padding: "32px 28px",
          borderRadius: 14,
          borderTop: "4px solid #2F7A1E",
          background: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
          color: "#2C2016",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <BrandLogo height={44} />
          <p style={{ margin: "10px 0 0", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, color: "#4A3728" }}>
            Houston IAH Airport
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
          Extended Stay America Suites Operations
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 11, lineHeight: 1.45, textAlign: "center", color: "#8a7a6b" }}>
          {t.mockup} <a href="https://theroyeffect.com" style={{ color: "inherit" }}>theroyeffect.com</a>
        </p>
      </main>
    </div>
  );
}

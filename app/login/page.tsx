import { ROLES, type Role } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { BrandLogo } from "@/components/BrandLogo";
import { LangToggle } from "@/components/LangToggle";

const TEXT = {
  en: {
    signIn: "Sign in",
    role: "Role",
    pin: "Staff PIN",
    error: "That PIN didn't match. Try again.",
    pinPlaceholder: "Enter PIN (dev: 1234, admin: 9999)",
    roles: {
      housekeeper: "Housekeeper",
      supervisor: "Supervisor",
      admin: "Administrator",
    },
  },
  es: {
    signIn: "Iniciar sesión",
    role: "Puesto",
    pin: "PIN del personal",
    error: "Ese PIN no coincide. Inténtalo de nuevo.",
    pinPlaceholder: "Ingresar PIN (1234)",
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

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
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

        <form method="post" action="/api/login" style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13, color: "#4A3728" }}>
            {t.role}
            <select name="role" defaultValue="housekeeper" style={field}>
              {Object.entries(t.roles).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13, color: "#4A3728" }}>
            {t.pin}
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder={t.pinPlaceholder}
              required
              style={field}
            />
          </label>

          {error && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "#FEE2E2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13, fontWeight: 600 }}>
              {t.error}
            </div>
          )}

          <button
            type="submit"
            style={{
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 8,
              border: "none",
              background: "#2F7A1E",
              color: "#FFFFFF",
              fontFamily: "inherit",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(47, 122, 30, 0.25)",
              marginTop: 4,
            }}
          >
            {t.signIn}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid #EBE5DB", textAlign: "center", fontSize: 12, color: "#827263" }}>
          Extended Stay America Suites Operations
        </div>
      </main>
    </div>
  );
}

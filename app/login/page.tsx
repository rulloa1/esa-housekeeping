import { ROLES, type Role } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";

const TEXT = {
  en: { signIn: "Sign in", role: "Role", pin: "PIN", error: "That PIN didn't match. Try again.", roles: ROLES },
  es: {
    signIn: "Iniciar sesión",
    role: "Puesto",
    pin: "PIN",
    error: "Ese PIN no coincide. Inténtalo de nuevo.",
    roles: { housekeeping: "Limpieza", frontdesk: "Recepción" } as Record<Role, string>,
  },
};

// Full-screen photo of the hotel front behind the sign-in card.
// public/login-bg.jpg is the front entrance (upscaled from a small photo, softly blurred); the gradient shows while it loads.
const BACKGROUND =
  "linear-gradient(rgba(10, 20, 35, 0.35), rgba(10, 20, 35, 0.55)), " +
  "url(/login-bg.jpg) center / cover no-repeat, " +
  "linear-gradient(160deg, #1d3c5e 0%, #3f6f93 55%, #c9d8e4 100%)";

const field = { padding: 12, fontSize: 16, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const lang = await getLang();
  const t = TEXT[lang];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BACKGROUND,
        display: "grid",
        placeItems: "center",
        padding: 16,
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <LangToggle lang={lang} style={{ position: "fixed", top: 16, right: 16 }} />
      <main
        lang={lang}
        style={{
          width: "100%",
          maxWidth: 380,
          boxSizing: "border-box",
          padding: "28px 24px",
          borderRadius: 18,
          background: "rgba(255, 255, 255, 0.86)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
          color: "#0f172a",
        }}
      >
        <p style={{ margin: 0, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: "#475569" }}>
          Extended Stay America · Houston IAH
        </p>
        <h1 style={{ margin: "6px 0 20px", fontSize: 28 }}>{t.signIn}</h1>
        <form method="post" action="/api/login" style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
            {t.role}
            <select name="role" defaultValue="housekeeping" style={field}>
              {Object.entries(t.roles).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
            {t.pin}
            <input name="pin" type="password" inputMode="numeric" autoComplete="current-password" required style={field} />
          </label>
          {error && <p style={{ color: "#b42318", margin: 0 }}>{t.error}</p>}
          <button
            type="submit"
            style={{ padding: 14, fontSize: 16, fontWeight: 600, borderRadius: 10, border: 0, background: "#1d4ed8", color: "#fff" }}
          >
            {t.signIn}
          </button>
        </form>
      </main>
    </div>
  );
}

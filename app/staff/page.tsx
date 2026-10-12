import Link from "next/link";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { BRAND } from "@/lib/brand";
import BrandLogo from "@/components/BrandLogo";
import LangToggle from "@/components/LangToggle";

export const dynamic = "force-dynamic";

const TEXT = {
  en: {
    eyebrow: "Houston IAH Airport",
    title: "Housekeeping",
    signedIn: { housekeeping: "Signed in as Housekeeping", frontdesk: "Signed in as Front desk" },
    board: ["Housekeeping board", "Suite status, assignments and guest requests"],
    cards: ["Guest QR cards", "Print a request card for each suite"],
    signOut: "Sign out",
  },
  es: {
    eyebrow: "Houston IAH Airport",
    title: "Limpieza",
    signedIn: { housekeeping: "Sesión: Limpieza", frontdesk: "Sesión: Recepción" },
    board: ["Tablero de limpieza", "Estado de suites, asignaciones y solicitudes"],
    cards: ["Tarjetas QR para huéspedes", "Imprime una tarjeta para cada suite"],
    signOut: "Cerrar sesión",
  },
} as const;

// Staff home: the two things staff open from here, in the ESA brand.
export default async function Home() {
  const role = await getRole();
  if (!role) redirect("/login");
  const lang = await getLang();
  const t = TEXT[lang];

  const card = (href: string, [title, sub]: readonly [string, string], primary: boolean) => (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 20px",
        textDecoration: "none",
        borderRadius: BRAND.radius,
        background: primary ? BRAND.green : "#fff",
        color: primary ? "#fff" : BRAND.text,
        border: primary ? `1px solid ${BRAND.green}` : `1px solid ${BRAND.border}`,
        boxShadow: "0 1px 2px rgba(72,55,41,.08)",
      }}
    >
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 18, fontWeight: 700 }}>{title}</span>
        <span style={{ display: "block", fontSize: 14, marginTop: 4, opacity: primary ? 0.9 : 1, color: primary ? "#fff" : BRAND.muted }}>
          {sub}
        </span>
      </span>
      <span aria-hidden style={{ fontSize: 22, fontWeight: 700, color: primary ? "#fff" : BRAND.green }}>›</span>
    </Link>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#f5f6f4" }}>
      <header
        style={{
          background: "#fff",
          borderTop: `4px solid ${BRAND.green}`,
          borderBottom: `1px solid ${BRAND.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <BrandLogo height={36} />
          <LangToggle lang={lang} />
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 48px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: BRAND.green }}>
          {t.eyebrow}
        </div>
        <h1 style={{ margin: "6px 0 4px", fontSize: 28, color: BRAND.text }}>{t.title}</h1>
        <p style={{ margin: "0 0 24px", color: BRAND.muted, fontSize: 14 }}>{t.signedIn[role]}</p>

        <div style={{ display: "grid", gap: 12 }}>
          {card("/housekeeping", t.board, true)}
          {card("/guest-links", t.cards, false)}
        </div>

        <form method="post" action="/api/logout" style={{ marginTop: 28 }}>
          <button
            type="submit"
            style={{
              font: "inherit",
              fontSize: 15,
              fontWeight: 700,
              padding: "12px 20px",
              borderRadius: 0,
              cursor: "pointer",
              background: "#fff",
              color: BRAND.text,
              border: `1px solid ${BRAND.border}`,
            }}
          >
            {t.signOut}
          </button>
        </form>
      </main>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { builtInSettings, getSession } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { BRAND } from "@/lib/brand";
import BrandLogo from "@/components/BrandLogo";
import LangToggle from "@/components/LangToggle";
import PageBanner, { BANNERS } from "@/components/PageBanner";

export const dynamic = "force-dynamic";

const TEXT = {
  en: {
    eyebrow: "Houston IAH Airport",
    title: "Housekeeping Operations",
    signedIn: {
      housekeeper: "Signed in as Housekeeper",
      supervisor: "Signed in as Supervisor",
      admin: "Signed in as Administrator",
      housekeeping: "Signed in as Housekeeper",
      frontdesk: "Signed in as Supervisor",
    },
    dashboard: ["Operations Dashboard", "Live room table, QA inspections, room assignments & maintenance"],
    housekeeper: ["Housekeeper Mobile View", "Mobile attendant workspace, cleaning checklists & supply requests"],
    board: ["3D Building Board", "Interactive 3D building layout, suite status and guest requests"],
    cards: ["Guest QR cards", "Print a request card for each suite"],
    lostFound: ["Lost & found", "Log items found in suites and around the hotel"],
    handover: ["Handover log", "Notes for the next shift"],
    roster: ["Staff roster", "Give each person their own PIN"],
    signOut: "Sign out",
  },
  es: {
    eyebrow: "Houston IAH Airport",
    title: "Operaciones de Limpieza",
    signedIn: {
      housekeeper: "Sesión: Limpieza",
      supervisor: "Sesión: Supervisor",
      admin: "Sesión: Administrador",
      housekeeping: "Sesión: Limpieza",
      frontdesk: "Sesión: Supervisor",
    },
    dashboard: ["Panel de Operaciones", "Control en vivo, inspecciones de calidad, asignaciones y mantenimiento"],
    housekeeper: ["Vista Móvil de Limpieza", "Espacio de trabajo del personal, listas de control y solicitudes"],
    board: ["Tablero 3D del Edificio", "Modelo interactivo 3D, estado de suites y solicitudes"],
    cards: ["Tarjetas QR para huéspedes", "Imprime una tarjeta para cada suite"],
    lostFound: ["Objetos perdidos", "Registra lo que encuentres en suites y en el hotel"],
    handover: ["Notas de turno", "Notas para el siguiente turno"],
    roster: ["Lista de personal", "Da a cada persona su propio PIN"],
    signOut: "Cerrar sesión",
  },
} as const;

// Staff home: operations portals in the ESA brand.
export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = session.role;
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

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 48px" }}>
        <PageBanner
          image={BANNERS.lobby}
          focus="55%"
          eyebrow={t.eyebrow}
          title={t.title}
          subtitle={session.staff ? session.staff.name + " · " + (t.signedIn[role as keyof typeof t.signedIn] || role).replace(/^.*?(as |: )/, "") : t.signedIn[role as keyof typeof t.signedIn] || role}
        />

        {role === "admin" && process.env.NODE_ENV === "production" && builtInSettings().length > 0 && (
          <div role="alert" style={{ padding: "12px 14px", marginBottom: 12, borderRadius: BRAND.radius, background: "#FEF3C7", border: "1px solid #FCD34D", color: "#78350F", fontSize: 14, lineHeight: 1.5 }}>
            <strong>Sign-in is using built-in sample values</strong> for {builtInSettings().join(", ")}. Anyone who knows the sample PINs can sign in.
            Set these in Vercel → Settings → Environment Variables, then redeploy.
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {card("/dashboard", t.dashboard, true)}
          {card("/housekeeper", t.housekeeper, false)}
          {card("/housekeeping", t.board, false)}
          {card("/handover", t.handover, false)}
          {card("/lost-found", t.lostFound, false)}
          {card("/guest-links", t.cards, false)}
          {role === "admin" && card("/roster", t.roster, false)}
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

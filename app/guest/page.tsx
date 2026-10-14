import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";
import { SUITES, guestKey } from "@/lib/guest";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Guest Self-Service Portal · ${BRAND.name}`,
};

export default async function GuestIndexPage() {
  const lang = await getLang();

  // Generate verified suite access links
  const suiteLinks = await Promise.all(
    SUITES.map(async (suite) => {
      const k = await guestKey(suite);
      return { suite, href: `/guest/${suite}?k=${k}` };
    })
  );

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-page)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: "var(--text-main)",
        padding: "24px 16px 60px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%", margin: "0 auto" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-block", marginBottom: 12 }}>
            <BrandLogo height={42} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--esa-green)", letterSpacing: "1px", textTransform: "uppercase" }}>
            {BRAND.location} · {BRAND.address}
          </div>
          <h1 style={{ margin: "6px 0", fontSize: 24, fontWeight: 800, color: "var(--text-main)" }}>
            {lang === "es" ? "Portal de Servicios al Huésped" : "Guest Self-Service Portal"}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {lang === "es"
              ? "Selecciona tu suite para solicitar toallas limpias, suministros de cocina o programar limpieza."
              : "Select your suite below to request fresh towels, amenities, kitchen supplies, or privacy mode."}
          </p>
        </div>

        {/* Hotel Photo Hero Banner */}
        <div
          style={{
            position: "relative",
            height: 180,
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 20,
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.65)), url(${BRAND.photos.hero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "flex-end",
            padding: "16px 20px",
            color: "#FFFFFF",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--color-accent, #FBBF24)" }}>
              {BRAND.tagline}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>
              {BRAND.name}
            </div>
          </div>
        </div>

        {/* Quick Highlights / Amenities Card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid var(--border-default)",
            padding: "18px 20px",
            marginBottom: 20,
            boxShadow: "var(--shadow-xs)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div style={{ padding: "8px" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>☕</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{BRAND.breakfast.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{BRAND.breakfast.hours}</div>
          </div>
          <div style={{ padding: "8px" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>🏊</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{BRAND.amenitiesList[0]}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Guest Access</div>
          </div>
          <div style={{ padding: "8px" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📶</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>High-Speed Wi-Fi</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{BRAND.wifiSsid}</div>
          </div>
          <div style={{ padding: "8px" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📞</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Front Desk</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Dial Ext. 0 ({BRAND.phone})</div>
          </div>
        </div>

        {/* Suite Selection Grid */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid var(--border-default)",
            padding: "20px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--esa-brown)" }}>
              {lang === "es" ? "Elige tu Suite" : "Select Your Suite"}
            </h2>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {suiteLinks.length} suites available
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: 8,
            }}
          >
            {suiteLinks.map(({ suite, href }) => (
              <Link
                key={suite}
                href={href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 8px",
                  borderRadius: 10,
                  backgroundColor: "var(--bg-muted)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-main)",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Floor {suite[0]}
                </span>
                <span style={{ fontSize: 17, fontWeight: 800, color: "var(--esa-green-dark)" }}>
                  {suite}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text-muted)" }}>
          <p style={{ margin: 0 }}>
            {BRAND.name} {BRAND.location} · Staffed 24/7 on site
          </p>
        </div>
      </div>
    </main>
  );
}

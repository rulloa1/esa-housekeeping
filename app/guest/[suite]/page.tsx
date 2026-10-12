import type { Metadata, Viewport } from "next";
import { get } from "@/lib/store";
import { validGuest } from "@/lib/guest";
import { getLang } from "@/lib/lang";
import GuestApp from "./GuestApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Housekeeping · Extended Stay America" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#338802" };

import BrandLogo from "@/components/BrandLogo";

// Guest-facing request page, opened from the QR code or link on a suite's card:
// /guest/231?k=<key>. No login; the key ties the page to that one suite.
export default async function GuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ suite: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { suite } = await params;
  const { k } = await searchParams;
  const lang = await getLang();
  if (!(await validGuest(suite, k))) {
    return (
      <main
        lang={lang}
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #FBF9F5 0%, #F3ECE2 100%)",
          padding: "24px 16px",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: "36px 24px",
            textAlign: "center",
            boxShadow: "0 10px 25px -5px rgba(44, 32, 22, 0.12)",
            border: "1px solid #EBE5DB",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <BrandLogo height={42} />
          </div>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
              margin: "0 auto 16px",
            }}
          >
            🔒
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#2C2016", margin: "0 0 10px", letterSpacing: -0.3 }}>
            {lang === "es" ? "Enlace de Suite no Válido" : "Invalid Suite Key"}
          </h1>
          <p style={{ color: "#5C4B3C", fontSize: 14, lineHeight: 1.5, margin: "0 0 24px" }}>
            {lang === "es"
              ? "Por seguridad de los huéspedes, escanea el código QR original en la tarjeta de tu suite o llama a la recepción."
              : "For guest privacy and security, please scan the QR code located on the card in your suite or contact the front desk."}
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            <a
              id="btn-guest-call-desk"
              href="tel:+18325550199"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: "#2F7A1E",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                padding: "12px 18px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              📞 {lang === "es" ? "Llamar a Recepción (Ext. 0)" : "Call Front Desk (Ext. 0)"}
            </a>
          </div>
        </div>
      </main>
    );
  }
  const doc = ((await get(suite)) ?? {}) as Record<string, any>;
  // Only what the guest needs: staff names stay on the staff side.
  const requests = (Array.isArray(doc.guestRequests) ? doc.guestRequests : []).map(
    (r: { type: string; at: string; doneAt?: string }) => ({ type: r.type, at: r.at, doneAt: r.doneAt }),
  );
  const roomType = doc.type || "King Suite";
  const floor = doc.floor || Number(suite[0]) || 1;

  return (
    <GuestApp
      lang={lang}
      suite={suite}
      k={k!}
      dnd={Boolean(doc.dndSince)}
      initialRequests={requests}
      roomType={roomType}
      floor={floor}
    />
  );
}

import type { Metadata, Viewport } from "next";
import { get } from "@/lib/store";
import { validGuest } from "@/lib/guest";
import { getLang } from "@/lib/lang";
import GuestApp from "./GuestApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Housekeeping · Extended Stay America" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#338802" };

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
      <main lang={lang} style={{ maxWidth: 420, margin: "0 auto", padding: "64px 24px", textAlign: "center", color: "#483729" }}>
        <h1 style={{ fontSize: 22 }}>{lang === "es" ? "Este enlace no es válido" : "This link isn't valid"}</h1>
        <p style={{ color: "#7a6a5d" }}>
          {lang === "es"
            ? "Escanea el código QR de la tarjeta en tu suite o llama a recepción."
            : "Scan the QR code on the card in your suite, or call the front desk."}
        </p>
      </main>
    );
  }
  const doc = (await get(suite)) ?? {};
  const requests = Array.isArray(doc.guestRequests) ? doc.guestRequests : [];
  return <GuestApp lang={lang} suite={suite} k={k!} dnd={Boolean(doc.dndSince)} initialRequests={requests} />;
}

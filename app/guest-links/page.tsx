import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getRole } from "@/lib/auth";
import { SUITES, guestKey } from "@/lib/guest";
import BrandLogo from "@/components/BrandLogo";
import { NavigationHeader } from "@/components/NavigationHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guest QR cards" };

// Staff-only sheet of QR cards, one per suite, to print and place in each suite.
// Each code opens that suite's guest request page.
export default async function GuestLinks() {
  const role = await getRole();
  if (!role) redirect("/login");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const cards = await Promise.all(
    SUITES.map(async (suite) => {
      const url = `${proto}://${host}/guest/${suite}?k=${await guestKey(suite)}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
      return { suite, url, svg };
    }),
  );
  return (
    <>
      <div className="no-print">
        <NavigationHeader currentRole={role} />
      </div>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px", color: "#483729" }}>
        <style>{`@media print { .no-print { display: none } main { padding: 0 } } .card { break-inside: avoid }`}</style>
        <div className="no-print">
        <h1 style={{ margin: "0 0 6px" }}>Guest QR cards</h1>
        <p style={{ margin: "0 0 20px", color: "#7a6a5d" }}>
          Print this page and place each card in its suite. Guests scan it to request cleaning, towels or amenities, or to
          turn on Do Not Disturb, and the request shows on the housekeeping board.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {cards.map((c) => (
          <div key={c.suite} className="card" style={{ border: "1px solid #DBDEDB", borderTop: "6px solid #338802", borderRadius: 4, padding: 16, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><BrandLogo height={32} /></div>
            <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#7a6a5d" }}>Housekeeping requests · Limpieza</div>
            <div style={{ fontSize: 26, fontWeight: 700, margin: "4px 0 10px" }}>Suite {c.suite}</div>
            <div style={{ width: 150, margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div style={{ fontSize: 13, color: "#7a6a5d", marginTop: 10 }}>Scan with your phone camera<br />Escanea con la cámara de tu teléfono</div>
            <a className="no-print" href={c.url} style={{ color: "#338802", display: "block", marginTop: 8, fontSize: 12, wordBreak: "break-all" }}>
              Open page
            </a>
          </div>
        ))}
      </div>
    </main>
  </>
  );
}

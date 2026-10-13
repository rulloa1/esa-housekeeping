import Link from "next/link";
import { redirect } from "next/navigation";
import { getRole, isSupervisor } from "@/lib/auth";
import { getAll } from "@/lib/store";
import { toRooms } from "@/lib/roomView";
import { hotelToday } from "@/lib/guest";
import { buildReport, lastDays } from "@/lib/report";
import { BRAND } from "@/lib/brand";
import { NavigationHeader } from "@/components/NavigationHeader";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const dayLabel = (day: string, today: string) => {
  if (day === today) return "Today";
  const d = new Date(`${day}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
};
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
const dash = (v: number | null, unit = "") => (v === null ? "–" : `${v}${unit}`);

// Shift report for supervisors and managers: one hotel day at a time, printable, with a CSV.
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const role = await getRole();
  if (!role) redirect("/login");
  if (!isSupervisor(role)) redirect("/housekeeper");

  const today = hotelToday();
  const days = lastDays(today, 14);
  const asked = (await searchParams).date;
  const day = asked && days.includes(asked) ? asked : today;
  const { docs } = await getAll();
  const r = buildReport(Object.values(toRooms(docs)), day);

  const tile = (label: string, value: string, sub?: string) => (
    <div style={{ padding: "12px 14px", background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: BRAND.text, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: BRAND.muted }}>{sub}</div>}
    </div>
  );
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12, color: BRAND.muted, textTransform: "uppercase", borderBottom: `1px solid ${BRAND.border}` };
  const td: React.CSSProperties = { padding: "10px", fontSize: 15, borderBottom: `1px solid ${BRAND.border}` };
  const btn: React.CSSProperties = {
    font: "inherit", fontSize: 14, fontWeight: 700, padding: "10px 14px", minHeight: 44, borderRadius: 8, cursor: "pointer",
    background: "#fff", color: BRAND.text, border: `1px solid ${BRAND.border}`, textDecoration: "none", display: "inline-flex", alignItems: "center",
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#f5f6f4", color: BRAND.text, fontFamily: BRAND.font }}>
      <style>{`@media print { header, .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <NavigationHeader currentRole={role} />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 48px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.green, textTransform: "uppercase", letterSpacing: 0.5 }}>Houston IAH Airport</div>
            <h1 style={{ fontSize: 26, margin: "2px 0 0" }}>Shift report · {dayLabel(day, today)}</h1>
            <div style={{ fontSize: 14, color: BRAND.muted }}>{day}</div>
          </div>
          <div className="no-print" style={{ display: "flex", gap: 8 }}>
            <PrintButton label="Print" style={btn} />
            <a href={`/api/reports?date=${day}`} style={btn}>Download CSV</a>
          </div>
        </div>

        <nav className="no-print" aria-label="Report day" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 16 }}>
          {days.map((d) => (
            <Link
              key={d}
              href={d === today ? "/reports" : `/reports?date=${d}`}
              aria-current={d === day ? "page" : undefined}
              style={{
                ...btn,
                flex: "0 0 auto",
                fontSize: 13,
                background: d === day ? BRAND.green : "#fff",
                color: d === day ? "#fff" : BRAND.text,
                borderColor: d === day ? BRAND.green : BRAND.border,
              }}
            >
              {dayLabel(d, today)}
            </Link>
          ))}
        </nav>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
          {tile("Suites cleaned", String(r.cleaned), r.avgCleanMinutes !== null ? `avg ${r.avgCleanMinutes} min each` : undefined)}
          {tile("Inspections", `${r.inspectionsPassed} ✓ · ${r.inspectionsFailed} ✗`, r.firstTimePassRate !== null ? `${r.firstTimePassRate}% passed first time` : undefined)}
          {tile("Guest requests", String(r.guestRequests), r.guestRequests ? `${r.guestDone} done · ${r.guestOpen} open${r.guestMedianMinutes !== null ? ` · ${r.guestMedianMinutes} min median` : ""}` : undefined)}
          {tile("Maintenance", `${r.maintenanceReported} new`, `${r.maintenanceResolved} resolved`)}
          {tile("Supply requests", String(r.suppliesRequested))}
        </section>

        <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>By person</h2>
        {r.people.length === 0 ? (
          <p style={{ color: BRAND.muted }}>No cleaning or inspections recorded for this day.</p>
        ) : (
          <div style={{ overflowX: "auto", background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 8, marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr><th style={th}>Person</th><th style={th}>Cleaned</th><th style={th}>Avg clean</th><th style={th}>Passed</th><th style={th}>Failed</th></tr>
              </thead>
              <tbody>
                {r.people.map((p) => (
                  <tr key={p.name}>
                    <td style={{ ...td, fontWeight: 700 }}>{p.name}</td>
                    <td style={td}>{p.cleaned}</td>
                    <td style={td}>{dash(p.avgMinutes, " min")}</td>
                    <td style={td}>{p.passed}</td>
                    <td style={{ ...td, color: p.failed ? "#B91C1C" : BRAND.text }}>{p.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Suite activity ({r.suites.length})</h2>
        <div style={{ display: "grid", gap: 6 }}>
          {r.suites.map((s) => (
            <details key={s.suite} style={{ background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 8, padding: "10px 14px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 28 }}>
                Suite {s.suite} <span style={{ fontWeight: 500, color: BRAND.muted }}>· {s.events.length} {s.events.length === 1 ? "entry" : "entries"}</span>
              </summary>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 6 }}>
                {s.events.map((e, i) => (
                  <li key={i} style={{ fontSize: 14, display: "flex", gap: 10 }}>
                    <span style={{ color: BRAND.muted, minWidth: 70 }}>{time(e.time)}</span>
                    <span><strong>{e.event}</strong> · {e.by}{e.details ? ` · ${e.details}` : ""}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
        <p style={{ fontSize: 13, color: BRAND.muted, marginTop: 16 }}>
          Worked out from each suite&apos;s history, which keeps its latest 50 entries, so older days may be incomplete.
        </p>
      </main>
    </div>
  );
}

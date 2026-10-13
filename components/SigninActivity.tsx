import { BRAND } from "@/lib/brand";
import { summarize, type SigninEntry } from "@/lib/signins";

const LABEL: Record<SigninEntry["outcome"], { text: string; color: string }> = {
  signedIn: { text: "Signed in", color: "#065F46" },
  wrongPin: { text: "Wrong PIN", color: "#92400E" },
  locked: { text: "Locked out", color: "#B91C1C" },
};
const ROLE: Record<string, string> = {
  housekeeper: "Housekeeping", housekeeping: "Housekeeping", supervisor: "Supervisor", frontdesk: "Supervisor", admin: "Administrator",
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

// Administrators: recent sign-ins, wrong PINs and lockouts (lib/signins.ts). Server-rendered, read-only.
export function SigninActivity({ entries }: { entries: SigninEntry[] }) {
  const s = summarize(entries);
  return (
    <section aria-label="Sign-in activity" style={{ maxWidth: 960, margin: "0 auto 48px", padding: "0 16px" }}>
      <div style={{ background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 12, padding: 16, display: "grid", gap: 12, color: BRAND.text }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Sign-in activity</h2>
        <p style={{ margin: 0, fontSize: 14, color: BRAND.muted }}>
          Last 24 hours: {s.signedIn} sign-in{s.signedIn === 1 ? "" : "s"}, {s.wrongPin} wrong PIN{s.wrongPin === 1 ? "" : "s"}, {s.locked} lockout{s.locked === 1 ? "" : "s"}.
          {s.wrongPin >= 10 || s.locked > 0 ? " Many wrong PINs can mean someone is guessing; consider changing the shared PINs." : ""}
        </p>
        {entries.length === 0 ? (
          <p style={{ margin: 0, color: BRAND.muted }}>Nothing recorded yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: BRAND.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  <th style={{ padding: "6px 8px" }}>When</th><th style={{ padding: "6px 8px" }}>What</th>
                  <th style={{ padding: "6px 8px" }}>Who</th><th style={{ padding: "6px 8px" }}>Device</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 50).map((e, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${BRAND.border}` }}>
                    <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{when(e.at)}</td>
                    <td style={{ padding: "8px", fontWeight: 700, color: LABEL[e.outcome]?.color }}>{LABEL[e.outcome]?.text ?? e.outcome}</td>
                    <td style={{ padding: "8px" }}>{e.name ?? `${ROLE[e.role] ?? "Unknown"} (${e.outcome === "signedIn" ? "shared PIN" : "role picked"})`}</td>
                    <td style={{ padding: "8px" }}>{e.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ margin: 0, fontSize: 12, color: BRAND.muted }}>The newest 500 entries are kept. PINs and network addresses are never recorded.</p>
      </div>
    </section>
  );
}

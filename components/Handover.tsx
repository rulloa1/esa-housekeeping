"use client";

import { useEffect, useMemo, useState } from "react";
import { BRAND } from "@/lib/brand";
import { TOPICS, openNotes, type HandoverNote } from "@/lib/handoverShared";
import { useAttendants } from "@/lib/useAttendants";

const REASON: Record<string, string> = {
  text: "Write the note first.",
  suite: "Enter a suite number like 214, or leave it empty.",
  tooMany: "Too many notes this hour. Try again later.",
  supervisorOnly: "Only a supervisor can mark notes handled.",
  notFound: "That note is gone (older than 30 days). Reload the page.",
};

const field: React.CSSProperties = {
  padding: "10px 12px", fontSize: 15, borderRadius: 8, border: `1px solid ${BRAND.border}`, background: "#fff",
  color: BRAND.text, fontFamily: "inherit", minHeight: 44, boxSizing: "border-box", width: "100%",
};
const button = (primary = false): React.CSSProperties => ({
  ...field, width: "auto", cursor: "pointer", fontWeight: 700,
  background: primary ? BRAND.green : "#fff", color: primary ? "#fff" : BRAND.text, border: primary ? "none" : field.border,
});
const card: React.CSSProperties = { background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 12, padding: 16 };
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

export function Handover({ initialNotes, canClose, staffName }: { initialNotes: HandoverNote[]; canClose: boolean; staffName: string | null }) {
  const [notes, setNotes] = useState(initialNotes);
  const attendants = useAttendants();
  const [who, setWho] = useState("");
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<string>("Front desk");
  const [suite, setSuite] = useState("");
  const [important, setImportant] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [show, setShow] = useState<"open" | "all">("open");
  const userName = staffName ?? (who || undefined);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("add");
    setMessage(null);
    try {
      const res = await fetch("/api/handover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, topic, suite, important, userName }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(REASON[data.reason] || "Couldn't save. Try again.");
      setNotes((list) => [data.note, ...list]);
      setText(""); setSuite(""); setImportant(false);
      setMessage({ ok: true, text: "Note saved for the next shift." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't save. Try again." });
    } finally {
      setBusy(null);
    }
  };

  const mark = async (note: HandoverNote, done: boolean) => {
    setBusy(note.id);
    setMessage(null);
    try {
      const res = await fetch("/api/handover", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: note.id, done, userName }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(REASON[data.reason] || "Couldn't save. Try again.");
      setNotes((list) => list.map((n) => (n.id === note.id ? data.note : n)));
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't save. Try again." });
    } finally {
      setBusy(null);
    }
  };

  // "Still open" = not handled yet, any age within the 30 days kept.
  const shown = useMemo(() => (show === "all" ? notes : notes.filter((n) => !n.doneAt)), [notes, show]);
  const recentOpen = openNotes(notes).length;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "16px 16px 48px", display: "grid", gap: 16, color: BRAND.text }}>
      <form onSubmit={add} style={{ ...card, display: "grid", gap: 12 }} aria-label="Leave a note">
        <h2 style={{ margin: 0, fontSize: 18 }}>Leave a note for the next shift</h2>
        <textarea style={{ ...field, minHeight: 88, resize: "vertical" }} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} required
          placeholder="e.g. 214 asked for a late checkout at 1 PM. PTAC in 118 still noisy; engineer coming tomorrow." aria-label="Note" />
        <div style={{ fontSize: 12, color: BRAND.muted }}>No guest phone numbers, card details or addresses here.</div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 13 }}>
            Topic
            <select style={field} value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 13 }}>
            Suite (optional)
            <input style={field} value={suite} onChange={(e) => setSuite(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="214" />
          </label>
          {!staffName && (
            <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 13 }}>
              Your name
              <select style={field} value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">Choose…</option>
                {attendants.map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          )}
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, fontWeight: 600, minHeight: 44 }}>
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} style={{ width: 20, height: 20, accentColor: "#B91C1C" }} />
          Important: show it at the top of the dashboard
        </label>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" style={button(true)} disabled={busy !== null}>{busy === "add" ? "Saving…" : "Save note"}</button>
          {message && <span role="status" style={{ fontWeight: 600, color: message.ok ? "#065F46" : "#B91C1C" }}>{message.text}</span>}
        </div>
      </form>

      <section style={{ ...card, display: "grid", gap: 12 }} aria-label="Notes">
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{recentOpen} open note{recentOpen === 1 ? "" : "s"} from the last 24 hours</h2>
          <select style={{ ...field, width: "auto" }} value={show} onChange={(e) => setShow(e.target.value as "open" | "all")} aria-label="Show">
            <option value="open">Still open</option>
            <option value="all">Last 30 days</option>
          </select>
        </div>
        {shown.length === 0 && <p style={{ margin: 0, color: BRAND.muted }}>{notes.length ? "Everything has been handled." : "No notes yet."}</p>}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {shown.map((n) => (
            <li key={n.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap", padding: 12, borderRadius: 10,
              border: `1px solid ${n.important && !n.doneAt ? "#FCA5A5" : BRAND.border}`, background: n.doneAt ? "#F7F7F5" : n.important ? "#FEF2F2" : "#fff" }}>
              <div style={{ flex: "1 1 260px", minWidth: 0, display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: n.important && !n.doneAt ? "#B91C1C" : BRAND.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {n.important ? "Important · " : ""}{n.topic}{n.suite ? ` · Suite ${n.suite}` : ""}
                </div>
                <div style={{ fontSize: 15, whiteSpace: "pre-wrap", textDecoration: n.doneAt ? "line-through" : "none", color: n.doneAt ? BRAND.muted : BRAND.text }}>{n.text}</div>
                <div style={{ fontSize: 13, color: BRAND.muted }}>
                  {n.by} · {when(n.at)}{n.doneAt ? ` · handled by ${n.doneBy} ${when(n.doneAt)}` : ""}
                </div>
              </div>
              {canClose && (
                <button type="button" style={button(!n.doneAt)} disabled={busy !== null} onClick={() => mark(n, !n.doneAt)}>
                  {busy === n.id ? "Saving…" : n.doneAt ? "Reopen" : "Mark handled"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

// Dashboard strip: open notes from the last 24 hours (important first), linking to the log.
export function HandoverStrip() {
  const [notes, setNotes] = useState<HandoverNote[] | null>(null);
  useEffect(() => {
    fetch("/api/handover", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setNotes(j?.notes ?? []))
      .catch(() => setNotes([]));
  }, []);
  if (!notes) return null;
  const open = openNotes(notes);
  const top = open.slice(0, 3);
  return (
    <section aria-label="Handover notes" style={{ background: "#FFFFFF", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", marginBottom: 0, height: "100%", boxSizing: "border-box", padding: "12px 16px", display: "grid", gap: 8, boxShadow: "var(--shadow-xs)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15, color: "var(--text-main)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--color-primary)" }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
          <span>Handover · {open.length ? `${open.length} open` : "nothing open"}</span>
        </strong>
        <a href="/handover" style={{ fontWeight: 700, fontSize: 13, color: "var(--color-primary)", minHeight: 36, display: "inline-flex", alignItems: "center" }}>
          {open.length ? "Read & add notes →" : "Add a note →"}
        </a>
      </div>
      {top.map((n) => (
        <div key={n.id} style={{ fontSize: 14, color: n.important ? "#B91C1C" : "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
          {n.important ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#DC2626", fontWeight: 700, fontSize: 10, padding: "1px 5px", borderRadius: 4, backgroundColor: "#FEF2F2", border: "1px solid #FECACA", flexShrink: 0 }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
              </svg>
              URGENT
            </span>
          ) : null}
          <span>{n.suite ? `${n.suite}: ` : ""}{n.text}</span>
          <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 4 }}>({n.by})</span>
        </div>
      ))}
    </section>
  );
}


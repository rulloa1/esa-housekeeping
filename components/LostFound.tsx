"use client";

import { useMemo, useState } from "react";
import { BRAND } from "@/lib/brand";
import { HOLD_DAYS, PLACES, type LostItem, type LostStatus } from "@/lib/lostFoundShared";
import { useAttendants } from "@/lib/useAttendants";
import { PhotoPicker, PhotoThumb } from "./PhotoPicker";

const REASON: Record<string, string> = {
  description: "Describe the item (at least 2 letters).",
  suite: "Enter the suite number, e.g. 214.",
  tooMany: "Too many items logged this hour. Try again later.",
  supervisorOnly: "Only a supervisor can close out an item.",
  notFound: "That item is no longer in the log. Reload the page.",
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
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
const days = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);

const STATUS_LABEL: Record<LostStatus, string> = { held: "Held", returned: "Returned to guest", disposed: "Disposed / donated" };

export function LostFound({ initialItems, canClose, staffName }: { initialItems: LostItem[]; canClose: boolean; staffName: string | null }) {
  const [items, setItems] = useState(initialItems);
  const attendants = useAttendants();
  const [who, setWho] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState<string>("Suite");
  const [suite, setSuite] = useState("");
  const [storedAt, setStoredAt] = useState("");
  const [valuable, setValuable] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [show, setShow] = useState<"held" | "all">("held");
  const [query, setQuery] = useState("");

  const userName = staffName ?? (who || undefined);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("add");
    setMessage(null);
    try {
      const res = await fetch("/api/lost-found", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, place, suite, storedAt, valuable, photoUrl, userName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(REASON[data.reason] || "Couldn't save. Try again.");
      setItems((list) => [data.item, ...list]);
      setDescription(""); setSuite(""); setStoredAt(""); setValuable(false); setPhotoUrl(null);
      setMessage({ ok: true, text: `Logged: ${data.item.description}.` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't save. Try again." });
    } finally {
      setBusy(null);
    }
  };

  const close = async (item: LostItem, status: LostStatus) => {
    let note: string | null = "";
    if (status !== "held") {
      note = window.prompt(status === "returned" ? "How was it returned? (e.g. picked up at front desk, shipped). Don't enter the guest's address or phone." : "What was done with it? (e.g. donated, discarded)", "");
      if (note === null) return;
    }
    setBusy(item.id);
    setMessage(null);
    try {
      const res = await fetch("/api/lost-found", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status, note, userName }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(REASON[data.reason] || "Couldn't save. Try again.");
      setItems((list) => list.map((x) => (x.id === item.id ? data.item : x)));
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't save. Try again." });
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (show === "all" || i.status === "held") && (!q || `${i.description} ${i.suite ?? ""} ${i.place} ${i.storedAt ?? ""}`.toLowerCase().includes(q)));
  }, [items, show, query]);
  const heldCount = items.filter((i) => i.status === "held").length;
  const overdue = items.filter((i) => i.status === "held" && days(i.foundAt) >= HOLD_DAYS).length;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "16px 16px 48px", display: "grid", gap: 16, color: BRAND.text }}>
      <form onSubmit={add} style={{ ...card, display: "grid", gap: 12 }} aria-label="Log a found item">
        <h2 style={{ margin: 0, fontSize: 18 }}>Log a found item</h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 13, gridColumn: "1 / -1" }}>
            What is it?
            <input style={field} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Black phone charger, iPhone cable" maxLength={200} required />
          </label>
          <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 13 }}>
            Where was it found?
            <select style={field} value={place} onChange={(e) => setPlace(e.target.value)}>
              {PLACES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          {place === "Suite" && (
            <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 13 }}>
              Suite
              <input style={field} value={suite} onChange={(e) => setSuite(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="214" required />
            </label>
          )}
          <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 13 }}>
            Where is it kept now? (optional)
            <input style={field} value={storedAt} onChange={(e) => setStoredAt(e.target.value)} placeholder="e.g. Front desk, drawer 2" maxLength={80} />
          </label>
          {!staffName && (
            <label style={{ display: "grid", gap: 4, fontWeight: 600, fontSize: 13 }}>
              Found by
              <select style={field} value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">Choose your name…</option>
                {attendants.map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          )}
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, fontWeight: 600, minHeight: 44 }}>
          <input type="checkbox" checked={valuable} onChange={(e) => setValuable(e.target.checked)} style={{ width: 20, height: 20, accentColor: BRAND.green }} />
          Valuable (wallet, phone, ID, jewelry, cash): lock it up and tell the manager
        </label>
        <PhotoPicker value={photoUrl} onChange={setPhotoUrl} userName={userName} />
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" style={button(true)} disabled={busy !== null}>{busy === "add" ? "Saving…" : "Log item"}</button>
          {message && <span role="status" style={{ fontWeight: 600, color: message.ok ? "#065F46" : "#B91C1C" }}>{message.text}</span>}
        </div>
      </form>

      <section style={{ ...card, display: "grid", gap: 12 }} aria-label="Lost and found log">
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {heldCount} item{heldCount === 1 ? "" : "s"} held
            {overdue > 0 && <span style={{ marginLeft: 8, fontSize: 13, color: "#92400E", background: "#FEF3C7", padding: "3px 8px", borderRadius: 999 }}>{overdue} past {HOLD_DAYS} days</span>}
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...field, width: 200 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item or suite" aria-label="Search" />
            <select style={{ ...field, width: "auto" }} value={show} onChange={(e) => setShow(e.target.value as "held" | "all")} aria-label="Show">
              <option value="held">Still held</option>
              <option value="all">Everything</option>
            </select>
          </div>
        </div>
        {shown.length === 0 && <p style={{ margin: 0, color: BRAND.muted }}>{items.length ? "Nothing matches." : "Nothing logged yet."}</p>}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {shown.map((i) => {
            const age = days(i.foundAt);
            return (
              <li key={i.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 12, borderRadius: 10, border: `1px solid ${BRAND.border}`, background: i.status === "held" ? "#fff" : "#F7F7F5" }}>
                <PhotoThumb url={i.photoUrl} size={64} label={`Photo of ${i.description}`} />
                <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 3 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {i.valuable && <span title="Valuable" aria-label="Valuable">🔒 </span>}
                    {i.description}
                  </div>
                  <div style={{ fontSize: 13, color: BRAND.muted }}>
                    {i.place === "Suite" ? `Suite ${i.suite}` : i.place} · found {when(i.foundAt)} by {i.foundBy}
                    {i.storedAt ? ` · kept at ${i.storedAt}` : ""}
                  </div>
                  {i.status === "held" ? (
                    <div style={{ fontSize: 13, fontWeight: 600, color: age >= HOLD_DAYS ? "#92400E" : BRAND.muted }}>
                      Held {age} day{age === 1 ? "" : "s"}{age >= HOLD_DAYS ? ": past the hold period, ask the manager before disposing" : ""}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 600, color: i.status === "returned" ? "#065F46" : BRAND.muted }}>
                      {STATUS_LABEL[i.status]} {i.closedAt ? when(i.closedAt) : ""} by {i.closedBy}{i.closeNote ? `: ${i.closeNote}` : ""}
                    </div>
                  )}
                </div>
                {canClose && (
                  <div style={{ display: "grid", gap: 6 }}>
                    {i.status === "held" ? (
                      <>
                        <button type="button" style={button(true)} disabled={busy !== null} onClick={() => close(i, "returned")}>Returned</button>
                        <button type="button" style={button()} disabled={busy !== null} onClick={() => close(i, "disposed")}>Disposed</button>
                      </>
                    ) : (
                      <button type="button" style={button()} disabled={busy !== null} onClick={() => close(i, "held")}>Reopen</button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

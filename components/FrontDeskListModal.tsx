"use client";

import { useEffect, useState } from "react";
import type { RoomDoc } from "@/lib/models";

interface Props {
  onClose: () => void;
  onApplied: (docs: Record<string, RoomDoc>, version: number, count: number) => void;
}

type Plan = { suite: string; summary: string }[];

const box: React.CSSProperties = {
  width: "100%",
  minHeight: 96,
  padding: "10px 12px",
  fontSize: 15,
  borderRadius: 8,
  border: "1px solid var(--border-default)",
  fontFamily: "inherit",
  boxSizing: "border-box",
  resize: "vertical",
};

const button = (primary: boolean, disabled = false): React.CSSProperties => ({
  padding: "10px 16px",
  minHeight: 44,
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14,
  fontFamily: "inherit",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
  background: primary ? "var(--color-primary)" : "#fff",
  color: primary ? "#fff" : "var(--text-main)",
  border: primary ? "1px solid var(--color-primary)" : "1px solid var(--border-default)",
});

// Supervisor tool: paste today's departures and arrivals from the property system, check what
// will change, then apply. Departures become checkouts needing a turnover; arrivals get raised
// priority and are flagged on the Overdue panel if not ready by 3 PM.
export function FrontDeskListModal({ onClose, onApplied }: Props) {
  const [departures, setDepartures] = useState("");
  const [arrivals, setArrivals] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const send = async (apply: boolean) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/suites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "front_desk_list", departures, arrivals, apply }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "failed");
      if (apply) {
        onApplied(json.docs, json.version, json.plan.length);
        onClose();
      } else {
        setPlan(json.plan);
        setInvalid(json.invalid);
      }
    } catch {
      setError("That didn't go through. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const edited = () => setPlan(null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Today's departures and arrivals"
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxWidth: 560, maxHeight: "90dvh", overflowY: "auto", background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xl)", padding: 20, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-main)" }}>Today&apos;s departures and arrivals</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="modal-close-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
          Paste suite numbers from the property system&apos;s departure and arrival reports, in any format. Departures become
          checkouts needing a turnover. Arrivals move up the list and show as overdue if they aren&apos;t ready by 3 PM.
        </p>
        <label style={{ display: "grid", gap: 6, fontWeight: 700, fontSize: 14 }}>
          Departures
          <textarea value={departures} onChange={(e) => { setDepartures(e.target.value); edited(); }} placeholder="e.g. 104, 117, 212" style={box} />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 700, fontSize: 14 }}>
          Arrivals
          <textarea value={arrivals} onChange={(e) => { setArrivals(e.target.value); edited(); }} placeholder="e.g. 104 220 315" style={box} />
        </label>

        {plan && (
          <div style={{ background: "var(--bg-muted, #F7F5F2)", borderRadius: 8, padding: 12, fontSize: 14, display: "grid", gap: 6 }}>
            <strong>{plan.length ? `${plan.length} suite${plan.length === 1 ? "" : "s"} will change:` : "Nothing to change. Those suites are already set."}</strong>
            {plan.map((p) => (
              <div key={p.suite}><strong>{p.suite}</strong> · {p.summary}</div>
            ))}
            {invalid.length > 0 && (
              <div style={{ color: "#B91C1C" }}>Not suite numbers, skipped: {invalid.join(", ")}</div>
            )}
          </div>
        )}
        {error && <div role="alert" style={{ color: "#B91C1C", fontWeight: 600, fontSize: 14 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" onClick={onClose} style={button(false)}>Cancel</button>
          {plan && plan.length > 0 ? (
            <button type="button" disabled={busy} onClick={() => send(true)} style={button(true, busy)}>
              {busy ? "Saving…" : `Apply to ${plan.length} suite${plan.length === 1 ? "" : "s"}`}
            </button>
          ) : (
            <button type="button" disabled={busy || (!departures.trim() && !arrivals.trim())} onClick={() => send(false)} style={button(true, busy || (!departures.trim() && !arrivals.trim()))}>
              {busy ? "Checking…" : "Check"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

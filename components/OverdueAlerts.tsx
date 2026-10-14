"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoomDoc } from "@/lib/models";
import { describe, overdueAll, type OverdueKind } from "@/lib/overdue";

const COLOR: Record<OverdueKind, string> = {
  guest: "var(--st-dirty, #DC2626)",
  checkin: "var(--st-dirty, #DC2626)",
  inspection: "var(--st-in-prog, #D97706)",
  cleaning: "var(--st-in-prog, #D97706)",
  maintenance: "var(--st-awaiting-insp, #7C3AED)",
};

// Supervisor dashboard panel: suites where work has waited too long (see lib/overdue.ts).
// Read-only; tapping a suite opens its details.
export function OverdueAlerts({ rooms, onSelectSuite }: { rooms: RoomDoc[]; onSelectSuite?: (id: string) => void }) {
  // Re-check every minute so the waiting times stay current between saves.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const flags = useMemo(() => overdueAll(rooms, now), [rooms, now]);
  const [open, setOpen] = useState(true);
  const [all, setAll] = useState(false);
  const SHOWN = 5;
  const visible = all ? flags : flags.slice(0, SHOWN);

  if (flags.length === 0) {
    return (
      <section style={{ ...panel, padding: "12px 16px", color: "var(--st-clean, #059669)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Nothing overdue right now.
      </section>
    );
  }

  return (
    <section style={panel} aria-label="Overdue">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          font: "inherit",
          color: "var(--st-dirty, #DC2626)",
          fontWeight: 800,
          fontSize: 15,
          minHeight: 44,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Overdue · {flags.length}
        </span>
        <span aria-hidden style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul style={{ listStyle: "none", margin: 0, padding: "0 8px 8px", display: "grid", gap: 4 }}>
          {visible.map((f) => (
            <li key={`${f.suite}-${f.kind}`}>
              <button
                type="button"
                onClick={() => onSelectSuite?.(f.suite)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--bg-muted, #F1F5F9)",
                  cursor: onSelectSuite ? "pointer" : "default",
                  font: "inherit",
                  textAlign: "left",
                  minHeight: 44,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text-main)", minWidth: 40 }}>{f.suite}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: COLOR[f.kind] }}>{describe(f)}</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{f.attendant || "Unassigned"}</span>
              </button>
            </li>
          ))}
          {flags.length > SHOWN && (
            <li>
              <button
                type="button"
                onClick={() => setAll((a) => !a)}
                style={{ width: "100%", minHeight: 44, border: "none", background: "transparent", font: "inherit", fontWeight: 700, fontSize: 14, color: "var(--text-secondary)", cursor: "pointer" }}
              >
                {all ? "Show fewer" : `Show all ${flags.length}`}
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

const panel: React.CSSProperties = {
  background: "var(--bg-card, #FFFFFF)",
  borderRadius: 12,
  border: "1px solid var(--border-default)",
  marginBottom: 16,
};

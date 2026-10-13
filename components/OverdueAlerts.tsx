"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoomDoc } from "@/lib/models";
import { describe, overdueAll, type OverdueKind } from "@/lib/overdue";

const COLOR: Record<OverdueKind, string> = {
  guest: "#B91C1C",
  checkin: "#B91C1C",
  inspection: "#92400E",
  cleaning: "#92400E",
  maintenance: "#6B21A8",
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
      <section style={{ ...panel, padding: "12px 16px", color: "#065F46", fontWeight: 600, fontSize: 14 }}>
        ✓ Nothing overdue right now.
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
          color: "#B91C1C",
          fontWeight: 800,
          fontSize: 15,
          minHeight: 44,
        }}
      >
        <span>⏱ Overdue · {flags.length}</span>
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
                  background: "var(--bg-muted, #F7F5F2)",
                  cursor: onSelectSuite ? "pointer" : "default",
                  font: "inherit",
                  textAlign: "left",
                  minHeight: 44,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 15, color: "var(--esa-brown, #483729)", minWidth: 40 }}>{f.suite}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: COLOR[f.kind] }}>{describe(f)}</span>
                <span style={{ fontSize: 13, color: "var(--text-muted, #7a6a5d)" }}>{f.attendant || "Unassigned"}</span>
              </button>
            </li>
          ))}
          {flags.length > SHOWN && (
            <li>
              <button
                type="button"
                onClick={() => setAll((a) => !a)}
                style={{ width: "100%", minHeight: 44, border: "none", background: "transparent", font: "inherit", fontWeight: 700, fontSize: 14, color: "var(--esa-brown, #483729)", cursor: "pointer" }}
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
  background: "#FFFFFF",
  borderRadius: 12,
  border: "1px solid var(--border-default)",
  marginBottom: 16,
};

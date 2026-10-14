"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomDoc } from "@/lib/models";
import { newWorkAlerts, type WorkAlert } from "@/lib/alerts";

// A soft two-tone chime. Browsers only allow sound after the person has touched the page once,
// so it is silently skipped until then.
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.32);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {}
}

const TONE: Record<WorkAlert["kind"], { bg: string; fg: string }> = {
  assigned: { bg: "var(--st-clean-bg, #ECFDF5)", fg: "var(--st-clean, #059669)" },
  guest: { bg: "var(--st-assigned-bg, #EFF6FF)", fg: "var(--st-assigned, #2563EB)" },
  failed: { bg: "var(--st-dirty-bg, #FEF2F2)", fg: "var(--st-dirty, #DC2626)" },
};

function AlertIcon({ kind }: { kind: WorkAlert["kind"] }) {
  if (kind === "assigned") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2v4" />
        <path d="m4.93 10.93 2.83-2.83" />
        <path d="M2 18h4" />
        <path d="M20 18h2" />
        <path d="m19.07 10.93-2.83-2.83" />
        <polygon points="12 6 9 14 15 14 12 6" />
        <line x1="8" y1="21" x2="16" y2="21" />
      </svg>
    );
  }
  if (kind === "guest") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

// Banner on the housekeeper's phone when new work for them arrives: a suite assigned to them, a
// guest request in one of their suites, or one of their suites failing inspection. Works from the
// page's live updates; nothing is saved.
export function HousekeeperAlerts({ rooms, me }: { rooms: RoomDoc[]; me: string }) {
  const prev = useRef<RoomDoc[] | null>(null);
  const prevMe = useRef(me);
  const [alerts, setAlerts] = useState<WorkAlert[]>([]);

  useEffect(() => {
    // Switching whose suites are shown is not new work.
    if (prevMe.current !== me) {
      prevMe.current = me;
      prev.current = rooms;
      setAlerts([]);
      return;
    }
    if (prev.current) {
      const fresh = newWorkAlerts(prev.current, rooms, me);
      if (fresh.length) {
        setAlerts((a) => [...fresh, ...a].slice(0, 6));
        try { navigator.vibrate?.([200, 100, 200]); } catch {}
        chime();
      }
    }
    prev.current = rooms;
  }, [rooms, me]);

  // Unread count in the tab title, so it shows on a locked or backgrounded screen's tab.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = alerts.length ? `(${alerts.length}) ${base}` : base;
  }, [alerts.length]);

  if (!alerts.length) return null;
  return (
    <div role="status" aria-live="polite" style={{ maxWidth: 840, margin: "12px auto 0", padding: "0 16px", display: "grid", gap: 6 }}>
      {alerts.map((a) => (
        <div
          key={a.id}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: TONE[a.kind].bg, color: TONE[a.kind].fg, fontWeight: 700, fontSize: 15 }}
        >
          <AlertIcon kind={a.kind} />
          <span style={{ flex: 1 }}>{a.text}</span>
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={() => setAlerts((list) => list.filter((x) => x.id !== a.id))}
            style={{
              border: "none",
              background: "transparent",
              color: "inherit",
              minWidth: 44,
              minHeight: 44,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
      {alerts.length > 1 && (
        <button
          type="button"
          onClick={() => setAlerts([])}
          style={{ justifySelf: "end", border: "none", background: "transparent", fontWeight: 700, fontSize: 14, color: "var(--text-secondary)", minHeight: 44, cursor: "pointer" }}
        >
          Dismiss all
        </button>
      )}
    </div>
  );
}


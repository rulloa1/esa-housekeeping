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

const TONE: Record<WorkAlert["kind"], { bg: string; fg: string; icon: string }> = {
  assigned: { bg: "#ECFDF5", fg: "#065F46", icon: "🧹" },
  guest: { bg: "#EFF6FF", fg: "#1E40AF", icon: "🛎️" },
  failed: { bg: "#FEE2E2", fg: "#B91C1C", icon: "✗" },
};

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
          <span aria-hidden>{TONE[a.kind].icon}</span>
          <span style={{ flex: 1 }}>{a.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setAlerts((list) => list.filter((x) => x.id !== a.id))}
            style={{ border: "none", background: "transparent", color: "inherit", fontSize: 18, minWidth: 44, minHeight: 44, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      ))}
      {alerts.length > 1 && (
        <button
          type="button"
          onClick={() => setAlerts([])}
          style={{ justifySelf: "end", border: "none", background: "transparent", fontWeight: 700, fontSize: 14, color: "var(--esa-brown, #483729)", minHeight: 44, cursor: "pointer" }}
        >
          Dismiss all
        </button>
      )}
    </div>
  );
}


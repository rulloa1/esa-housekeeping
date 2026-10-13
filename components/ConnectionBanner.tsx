"use client";

import { useConnection } from "@/lib/reliableFetch";

// Shown on housekeeper screens when the phone is offline or saves are waiting to be sent.
export function ConnectionBanner() {
  const { online, waiting } = useConnection();
  if (online && waiting === 0) return null;
  return (
    <div role="status" aria-live="polite" style={{
      // Pinned to the top above everything, including an open checklist (its buttons are at the bottom).
      position: "fixed", left: 0, right: 0, top: 0, zIndex: 2000, padding: "calc(10px + env(safe-area-inset-top)) 16px 10px",
      textAlign: "center", fontWeight: 700, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      background: online ? "#FEF3C7" : "#FEE2E2", color: online ? "#78350F" : "#991B1B", borderBottom: "1px solid rgba(0,0,0,0.08)",
    }}>
      {online
        ? `Sending ${waiting} saved change${waiting === 1 ? "" : "s"}… keep this page open.`
        : `No connection. Your taps are kept${waiting ? ` (${waiting} waiting)` : ""} and will send when Wi-Fi is back. Keep this page open.`}
    </div>
  );
}

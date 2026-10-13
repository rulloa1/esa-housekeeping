"use client";

import { useEffect, useState } from "react";

type State = "loading" | "unsupported" | "needsInstall" | "notConfigured" | "blocked" | "off" | "on";

const toKey = (base64: string) => {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

// "Notifications on/off" for this phone or iPad. `name` is whose suites it follows (a housekeeper);
// leave it out on supervisor screens. See lib/push.ts.
export function PushToggle({ name, compact = false }: { name?: string; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) return setState(isIOS() && !standalone() ? "needsInstall" : "unsupported");
      if (!("PushManager" in window)) return setState(isIOS() && !standalone() ? "needsInstall" : "unsupported");
      const res = await fetch("/api/push", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (!res?.publicKey) return setState("notConfigured");
      setKey(res.publicKey);
      if (Notification.permission === "denied") return setState("blocked");
      setState((await currentSubscription()) && Notification.permission === "granted" ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  // Keep the server's name for this device in step with the housekeeper picked on the page.
  useEffect(() => {
    if (state !== "on" || !name) return;
    currentSubscription().then((sub) => {
      if (sub) fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), name }) }).catch(() => {});
    });
  }, [state, name]);

  const turnOn = async () => {
    if (!key) return;
    setBusy(true);
    setNote("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "blocked" : "off"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), name }) });
      if (!res.ok) throw new Error(String(res.status));
      setState("on");
      setNote(name ? `You'll get a notification for ${name}'s new suites and guest requests.` : "You'll get guest requests for unassigned suites.");
    } catch {
      setNote("Couldn't turn notifications on. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      setNote("");
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading" || state === "unsupported" || state === "notConfigured") return null;

  const btn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: compact ? "8px 12px" : "8px 14px",
    borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: busy ? "wait" : "pointer",
    border: "1px solid var(--border-default, #DBDEDB)", background: state === "on" ? "#ECFDF5" : "#fff",
    color: state === "on" ? "#065F46" : "var(--esa-brown, #483729)",
  };

  return (
    <div style={{ display: "grid", gap: 4, justifyItems: "start" }}>
      {state === "needsInstall" && (
        <div style={{ fontSize: 13, color: "var(--text-muted, #7a6a5d)", maxWidth: 360 }}>
          🔔 For notifications on this iPhone or iPad: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, and open the app from there.
        </div>
      )}
      {state === "blocked" && (
        <div style={{ fontSize: 13, color: "var(--text-muted, #7a6a5d)", maxWidth: 360 }}>
          🔕 Notifications are blocked for this app. Allow them in the device&apos;s settings, then reload.
        </div>
      )}
      {(state === "off" || state === "on") && (
        <button type="button" disabled={busy} onClick={state === "on" ? turnOff : turnOn} style={btn} aria-pressed={state === "on"}>
          {state === "on" ? "🔔 Notifications on" : "🔕 Turn on notifications"}
        </button>
      )}
      {note && <div role="status" style={{ fontSize: 12, color: "var(--text-muted, #7a6a5d)", maxWidth: 360 }}>{note}</div>}
    </div>
  );
}

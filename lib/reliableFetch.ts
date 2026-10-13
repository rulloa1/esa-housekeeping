"use client";

// Saves from housekeeper phones on corridor Wi-Fi. A save that can't reach the server (no
// connection, or the server briefly unavailable) is tried again: right away when the phone comes
// back online, otherwise after 2, 4, 8, 15 and 30 seconds, then every 30 seconds for up to
// 10 minutes. Answers from the server (saved, or refused with a reason) are returned as they are
// and never retried, so a refused save is never repeated.
//
// The page must stay open for a retry to happen; useConnection() below drives the "offline,
// keep this page open" banner.
import { useEffect, useState } from "react";

const DELAYS = [2000, 4000, 8000, 15000, 30000];
const GIVE_UP_MS = 10 * 60 * 1000;
const RETRYABLE = new Set([502, 503, 504]);

let pending = 0;
const listeners = new Set<(n: number) => void>();
const announce = () => listeners.forEach((l) => l(pending));

const waitForOnlineOr = (ms: number) =>
  new Promise<void>((resolve) => {
    const done = () => { clearTimeout(t); window.removeEventListener("online", done); resolve(); };
    const t = setTimeout(done, ms);
    window.addEventListener("online", done);
  });

export async function reliableFetch(url: string, init: RequestInit): Promise<Response> {
  const started = Date.now();
  let counted = false;
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(url, init);
        if (!RETRYABLE.has(res.status) || Date.now() - started > GIVE_UP_MS) return res;
      } catch (err) {
        if (Date.now() - started > GIVE_UP_MS) throw err;
      }
      if (!counted) { counted = true; pending++; announce(); }
      await waitForOnlineOr(DELAYS[Math.min(attempt, DELAYS.length - 1)]);
    }
  } finally {
    if (counted) { pending--; announce(); }
  }
}

// { online, waiting }: whether the browser thinks it has a connection, and how many saves are
// waiting to be retried.
export function useConnection(): { online: boolean; waiting: number } {
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(pending);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    listeners.add(setWaiting);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      listeners.delete(setWaiting);
    };
  }, []);
  return { online, waiting };
}

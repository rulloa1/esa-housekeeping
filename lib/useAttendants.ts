"use client";

import { useEffect, useState } from "react";
import { STAFF_ATTENDANTS } from "./models";

// Names to offer when assigning suites: the active housekeepers on the staff roster, or the
// built-in demo list while the roster is still empty.
export function useAttendants(): string[] {
  const [names, setNames] = useState<string[]>(STAFF_ATTENDANTS);
  useEffect(() => {
    let live = true;
    fetch("/api/staff", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { staff?: { name: string; role: string; active: boolean }[] } | null) => {
        const list = (json?.staff ?? []).filter((s) => s.active && s.role === "housekeeper").map((s) => s.name);
        if (live && list.length) setNames(list);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return names;
}

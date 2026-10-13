import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";
import { get, put, snapshot, withSuiteLock, getAll } from "@/lib/store";
import { hotelToday } from "@/lib/guest";
import { rolloverChange, type RolloverRoom } from "@/lib/rollover";

export const dynamic = "force-dynamic";

// Daily, run by Vercel Cron (vercel.json) at 10:00 UTC (5 AM Houston in summer, 4 AM in winter):
// 1. copies every suite to hk:snapshot:<date> (kept 30 days);
// 2. the new-day reset (lib/rollover.ts), unless HK_ROLLOVER=0.
// When CRON_SECRET is set, Vercel sends it as a bearer token and other callers are refused.
// Restore a day: copy that snapshot's docs back into the hk:suites hash (see README).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (secret && !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const date = hotelToday();
  const suites = await snapshot(date);

  let rolledOver = 0;
  if (process.env.HK_ROLLOVER !== "0") {
    const { docs } = await getAll();
    for (const id of Object.keys(docs)) {
      await withSuiteLock(id, async () => {
        const room = (await get(id)) as RolloverRoom | null;
        if (!room) return;
        const change = rolloverChange(room, date);
        if (!change) return;
        const now = new Date().toISOString();
        const history = Array.isArray(room.history) ? room.history : [];
        await put(id, {
          ...room,
          ...change.changes,
          updatedAt: now,
          history: [
            { id: `evt-${Date.now()}-newday`, event: "New Day", details: `New-day reset: ${change.summary.join(", ")}.`, by: "System", role: "system", timestamp: now },
            ...history,
          ].slice(0, 50),
        });
        rolledOver++;
      });
    }
  }
  return NextResponse.json({ ok: true, date, suites, rolledOver });
}

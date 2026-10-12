import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";
import { snapshot } from "@/lib/store";
import { hotelToday } from "@/lib/guest";

export const dynamic = "force-dynamic";

// Daily copy of every suite to hk:snapshot:<date> (kept 30 days), run by Vercel Cron (vercel.json).
// When CRON_SECRET is set, Vercel sends it as a bearer token and other callers are refused.
// Restore a day: copy that snapshot's docs back into the hk:suites hash (see README).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (secret && !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const date = hotelToday();
  const suites = await snapshot(date);
  return NextResponse.json({ ok: true, date, suites });
}

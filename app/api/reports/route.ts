import { NextResponse } from "next/server";
import { getRole, isSupervisor } from "@/lib/auth";
import { getAll } from "@/lib/store";
import { toRooms } from "@/lib/roomView";
import { hotelToday } from "@/lib/guest";
import { buildReport, lastDays, reportCsv } from "@/lib/report";

export const dynamic = "force-dynamic";

// GET /api/reports?date=YYYY-MM-DD  -> the day's shift report as CSV (supervisors and admins).
export async function GET(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupervisor(role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const days = lastDays(hotelToday(), 14);
  const asked = new URL(req.url).searchParams.get("date") ?? days[0];
  if (!days.includes(asked)) return NextResponse.json({ error: "date must be one of the last 14 days" }, { status: 400 });
  const { docs } = await getAll();
  const csv = reportCsv(buildReport(Object.values(toRooms(docs)), asked));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="esa-iah-shift-report-${asked}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

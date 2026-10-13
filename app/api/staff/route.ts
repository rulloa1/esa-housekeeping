import { NextResponse } from "next/server";
import { getSession, isAdmin, isSupervisor } from "@/lib/auth";
import { StaffError, createStaff, listStaff, publicView } from "@/lib/staff";

export const dynamic = "force-dynamic";

// GET /api/staff
//   Supervisors and admins: the whole roster (no PINs).
//   Housekeepers: just the active housekeepers' names, for the attendant lists.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const all = await listStaff();
  if (isSupervisor(session.role)) return NextResponse.json({ staff: all.map(publicView) });
  return NextResponse.json({
    staff: all.filter((s) => s.active && s.role === "housekeeper").map(({ id, name, role, active }) => ({ id, name, role, active })),
  });
}

// POST /api/staff { name, role, pin }  (admin only)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(session.role)) return NextResponse.json({ error: "forbidden", reason: "adminOnly" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  try {
    const rec = await createStaff({ name: body.name, role: body.role, pin: body.pin });
    return NextResponse.json({ ok: true, staff: publicView(rec) }, { status: 201 });
  } catch (err) {
    if (err instanceof StaffError) return NextResponse.json({ error: "invalid", reason: err.reason }, { status: err.status });
    throw err;
  }
}

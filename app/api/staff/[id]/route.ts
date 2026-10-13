import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { StaffError, publicView, updateStaff } from "@/lib/staff";

export const dynamic = "force-dynamic";

// PATCH /api/staff/:id { name?, role?, active?, pin? }  (admin only)
// There is no DELETE: switching someone off (active: false) ends their sign-in at once and keeps
// their name on past history.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(session.role)) return NextResponse.json({ error: "forbidden", reason: "adminOnly" }, { status: 403 });
  // An admin can't switch off or demote their own sign-in and lock everyone out of the roster.
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  if (session.staff?.id === id && (body.active === false || (body.role !== undefined && body.role !== "admin"))) {
    return NextResponse.json({ error: "invalid", reason: "self" }, { status: 400 });
  }
  try {
    const rec = await updateStaff(id, { name: body.name, role: body.role, active: body.active, pin: body.pin });
    return NextResponse.json({ ok: true, staff: publicView(rec) });
  } catch (err) {
    if (err instanceof StaffError) return NextResponse.json({ error: "invalid", reason: err.reason }, { status: err.status });
    throw err;
  }
}

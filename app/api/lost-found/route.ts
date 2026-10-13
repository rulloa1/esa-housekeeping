import { NextResponse } from "next/server";
import { actorName, getSession, isSupervisor } from "@/lib/auth";
import { hit } from "@/lib/store";
import { LostFoundError, MAX_ITEMS_SHOWN, addItem, listItems, newItem, setStatus } from "@/lib/lostFound";

export const dynamic = "force-dynamic";

// GET /api/lost-found: the log, for any signed-in staff member.
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ items: (await listItems()).slice(0, MAX_ITEMS_SHOWN) });
}

// POST /api/lost-found { description, place, suite?, storedAt?, valuable?, photoUrl?, userName? }
// Anyone signed in can log a found item.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  const who = actorName(session, body.userName);
  if ((await hit(`hk:lostfound:count:${who.toLowerCase()}:${Math.floor(Date.now() / 3_600_000)}`, 3600)) > 60) {
    return NextResponse.json({ error: "too many items logged this hour", reason: "tooMany" }, { status: 429 });
  }
  try {
    const item = newItem(body, who);
    await addItem(item);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    if (err instanceof LostFoundError) return NextResponse.json({ error: "invalid", reason: err.reason }, { status: err.status });
    throw err;
  }
}

// PATCH /api/lost-found { id, status: "returned" | "disposed" | "held", note? }  (supervisors only)
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupervisor(session.role)) return NextResponse.json({ error: "forbidden", reason: "supervisorOnly" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    const item = await setStatus(body?.id, body?.status, actorName(session, body?.userName), body?.note);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    if (err instanceof LostFoundError) return NextResponse.json({ error: "invalid", reason: err.reason }, { status: err.status });
    throw err;
  }
}

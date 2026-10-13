import { NextResponse } from "next/server";
import { getSession, isSupervisor } from "@/lib/auth";
import { pushPublicKey, removeSubscription, saveSubscription, validSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

// GET /api/push -> { publicKey } (null when notifications aren't set up on the server)
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ publicKey: pushPublicKey() });
}

// POST /api/push { subscription, name? }
// Signs this device up for notifications. With a personal PIN the name is the person's own; with
// the shared housekeeping PIN it's the name picked on the page. Supervisors follow the whole hotel.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushPublicKey()) return NextResponse.json({ error: "notifications are not set up", reason: "notConfigured" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { subscription?: unknown; name?: unknown } | null;
  if (!body || !validSubscription(body.subscription)) return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  const sent = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  const name = session.staff?.name ?? (isSupervisor(session.role) ? "" : sent);
  if (!isSupervisor(session.role) && !name) return NextResponse.json({ error: "name required" }, { status: 400 });
  await saveSubscription(body.subscription, name, session.role);
  return NextResponse.json({ ok: true, name });
}

// DELETE /api/push { endpoint }
export async function DELETE(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  await removeSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { actorName, getSession, isSupervisor } from "@/lib/auth";
import { hit } from "@/lib/store";
import { HandoverError, addNote, listNotes, newNote, setDone } from "@/lib/handover";

export const dynamic = "force-dynamic";

// GET /api/handover: the last 30 days of notes, newest first. Any signed-in staff.
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ notes: await listNotes() });
}

// POST /api/handover { text, topic?, important?, suite?, userName? }: any signed-in staff.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  const by = actorName(session, body.userName);
  if ((await hit(`hk:handover:count:${by.toLowerCase()}:${Math.floor(Date.now() / 3_600_000)}`, 3600)) > 60) {
    return NextResponse.json({ error: "too many notes this hour", reason: "tooMany" }, { status: 429 });
  }
  try {
    const note = newNote(body, by, session.role);
    await addNote(note);
    return NextResponse.json({ ok: true, note }, { status: 201 });
  } catch (err) {
    if (err instanceof HandoverError) return NextResponse.json({ error: "invalid", reason: err.reason }, { status: err.status });
    throw err;
  }
}

// PATCH /api/handover { id, done: boolean }: supervisors mark a note handled, or reopen it.
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupervisor(session.role)) return NextResponse.json({ error: "forbidden", reason: "supervisorOnly" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    const note = await setDone(body?.id, body?.done !== false, actorName(session, body?.userName));
    return NextResponse.json({ ok: true, note });
  } catch (err) {
    if (err instanceof HandoverError) return NextResponse.json({ error: "invalid", reason: err.reason }, { status: err.status });
    throw err;
  }
}

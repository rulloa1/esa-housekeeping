import { NextResponse } from "next/server";
import { get, put } from "@/lib/store";
import { REQUEST_LABEL, hotelTime, hotelToday, validGuest, type GuestRequest } from "@/lib/guest";

export const dynamic = "force-dynamic";

type Entry = { type: GuestRequest; at: string };
const REPEAT_MS = 2 * 60 * 1000; // a second tap on the same tile within 2 minutes is ignored

// POST /api/guest/:suite  { k, type }  from the guest request page.
// Writes into the suite's board document: a cleaning request marks the suite as needing
// service, towels and amenities add a line to its notes, and DND sets the board's DND sign.
export async function POST(req: Request, { params }: { params: Promise<{ suite: string }> }) {
  const { suite } = await params;
  const body = (await req.json().catch(() => null)) as { k?: string; type?: string } | null;
  if (!(await validGuest(suite, body?.k))) return NextResponse.json({ error: "invalid link" }, { status: 403 });
  const type = body?.type as GuestRequest;
  if (!(type in REQUEST_LABEL)) return NextResponse.json({ error: "unknown request" }, { status: 400 });

  const doc = (await get(suite)) ?? {};
  const now = new Date();
  const at = now.toISOString();
  const history = (Array.isArray(doc.guestRequests) ? doc.guestRequests : []) as Entry[];
  const last = history.find((r) => r.type === type);
  if (last && now.getTime() - Date.parse(last.at) < REPEAT_MS) {
    return NextResponse.json({ ok: true, requests: history });
  }

  const next: Record<string, unknown> = { ...doc, example: false, updatedAt: at, updatedBy: "guest" };
  if (type === "dnd_on") {
    next.dndSince = doc.dndSince || hotelToday();
  } else if (type === "dnd_off") {
    next.dndSince = null;
    next.welfareDone = null;
  } else {
    // Requests show on the board in the suite's notes; a cleaning request also flags it
    // as needing service unless housekeeping is already in there or it is out of order.
    if (type === "cleaning" && doc.status !== "in_progress" && doc.status !== "ooo") next.status = "dirty";
    const line = `Guest: ${REQUEST_LABEL[type]} at ${hotelTime(at)}`;
    next.notes = doc.notes ? `${line}\n${doc.notes}` : line;
  }
  const requests = [{ type, at }, ...history].slice(0, 10);
  next.guestRequests = requests;
  await put(suite, next);
  return NextResponse.json({ ok: true, requests });
}

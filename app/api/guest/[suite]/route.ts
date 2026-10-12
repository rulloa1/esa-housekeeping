import { NextResponse } from "next/server";
import { get, hit, put, withSuiteLock } from "@/lib/store";
import { REQUEST_LABEL, hotelTime, hotelToday, validGuest, type GuestRequest } from "@/lib/guest";

export const dynamic = "force-dynamic";

type Entry = { type: GuestRequest; at: string; doneAt?: string; doneBy?: string };
const REPEAT_MS = 2 * 60 * 1000; // a second tap on the same tile within 2 minutes is ignored
const HOURLY_LIMIT = 10; // requests per suite per hour; more than that is someone playing with the link
// A suite the front desk has marked Vacant or Checkout has no current guest, so a request from
// its card is a past guest's (the card's link never changes). Those are refused.
const NO_GUEST = ["vacant", "checkout"];

// POST /api/guest/:suite  { k, type }  from the guest request page.
// Writes into the suite's board document: a cleaning request marks the suite as needing
// service, towels and amenities add a line to its notes, and DND sets the board's DND sign.
const forGuest = (list: Entry[]) => list.map(({ type, at, doneAt }) => ({ type, at, doneAt }));

export async function POST(req: Request, { params }: { params: Promise<{ suite: string }> }) {
  const { suite } = await params;
  const body = (await req.json().catch(() => null)) as { k?: string; type?: string } | null;
  if (!(await validGuest(suite, body?.k))) return NextResponse.json({ error: "invalid link" }, { status: 403 });
  const type = body?.type as GuestRequest;
  if (!(type in REQUEST_LABEL)) return NextResponse.json({ error: "unknown request" }, { status: 400 });

  // Under the suite's lock, so a staff save landing at the same moment can't overwrite this request.
  return withSuiteLock(suite, async () => {
    const doc = ((await get(suite)) ?? {}) as Record<string, any>;
    const now = new Date();
    const at = now.toISOString();
    const history = (Array.isArray(doc.guestRequests) ? doc.guestRequests : []) as Entry[];
    const last = history.find((r) => r.type === type);
    if (last && now.getTime() - Date.parse(last.at) < REPEAT_MS) {
      return NextResponse.json({ ok: true, requests: forGuest(history) });
    }
    if (NO_GUEST.includes(doc.occ)) {
      return NextResponse.json({ error: "not checked in", reason: "noGuest" }, { status: 409 });
    }
    if ((await hit(`hk:guest:rate:${suite}`, 3600)) > HOURLY_LIMIT) {
      return NextResponse.json({ error: "too many requests", reason: "limit" }, { status: 429 });
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
      if (type === "cleaning" && !["in_progress", "ooo", "maintenance"].includes(doc.status)) next.status = "dirty";
      const line = `Guest: ${REQUEST_LABEL[type]} at ${hotelTime(at)}`;
      next.notes = (doc.notes ? `${line}\n${doc.notes}` : line).slice(0, 4000);
    }
    // The suite's audit trail (shown in the operations dashboard's room history).
    if (Array.isArray(doc.history)) {
      next.history = [
        { id: `evt-${Date.now()}-guest`, event: "Guest Request", details: REQUEST_LABEL[type], by: "Guest", role: "guest", timestamp: at },
        ...doc.history,
      ].slice(0, 50);
    }
    const requests = [{ type, at }, ...history].slice(0, 10);
    next.guestRequests = requests;
    await put(suite, next);
    return NextResponse.json({ ok: true, requests: forGuest(requests) });
  });
}

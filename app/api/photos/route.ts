import { NextResponse } from "next/server";
import { actorName, getSession } from "@/lib/auth";
import { hotelToday } from "@/lib/guest";
import { PhotoError, savePhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";

// POST /api/photos { image: "data:image/jpeg;base64,…", userName? } → { url: "/api/photos/<id>" }
// Any signed-in staff member. The url is then sent with the ticket, inspection or found item.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { image?: unknown; userName?: unknown } | null;
  try {
    const url = await savePhoto(body?.image, actorName(session, body?.userName), hotelToday());
    return NextResponse.json({ ok: true, url }, { status: 201 });
  } catch (err) {
    if (err instanceof PhotoError) return NextResponse.json({ error: "photo refused", reason: err.reason }, { status: err.status });
    throw err;
  }
}

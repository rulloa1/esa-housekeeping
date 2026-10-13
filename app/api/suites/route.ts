import { NextResponse, after } from "next/server";
import { notify } from "@/lib/push";
import { actorName, getRole, getSession } from "@/lib/auth";
import { getAll, getVersion } from "@/lib/store";
import { toRoom } from "@/lib/roomView";

export const dynamic = "force-dynamic";

// GET /api/suites?since=<version>
// Returns { version, docs } or, when nothing changed since `since`, { version, unchanged: true }.
export async function GET(req: Request) {
  if (!(await getRole())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const since = new URL(req.url).searchParams.get("since");
  if (since !== null && Number(since) === (await getVersion())) {
    return NextResponse.json({ version: Number(since), unchanged: true });
  }
  return NextResponse.json(await getAll());
}

// POST /api/suites
// Batch operations (batch assign, bulk priority, etc.)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = session.role;

  // Only supervisors and administrators can perform batch suite assignments
  const isSup = role === "supervisor" || role === "admin" || role === "frontdesk";
  if (!isSup) {
    return NextResponse.json({ error: "Forbidden: Only supervisors can perform batch assignments" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    suiteIds?: string[];
    attendant?: string | null;
    priority?: "urgent" | "high" | "standard" | "low";
    instructions?: string;
    userName?: string;
  } | null;

  if (body?.action === "reset_baseline") {
    const { resetToDefault, getAll, snapshotBeforeReset } = await import("@/lib/store");
    // Keep a copy of every suite first, so a reset pressed by mistake can be undone (see README).
    const savedAs = await snapshotBeforeReset();
    console.warn("suites reset to the demo baseline; previous state saved as hk:snapshot:" + savedAs);
    await resetToDefault();
    const updated = await getAll();
    return NextResponse.json({
      ok: true,
      action: "reset_baseline",
      savedAs,
      version: updated.version,
      docs: updated.docs,
    });
  }

  // Today's departures and arrivals from the front desk (lib/frontDesk.ts). With apply: false it
  // only previews what would change.
  if (body?.action === "front_desk_list") {
    const { parseSuiteList, frontDeskChange } = await import("@/lib/frontDesk");
    const { hotelToday } = await import("@/lib/guest");
    const { get, put, withSuiteLock, snapshotBeforeReset } = await import("@/lib/store");
    const raw = body as unknown as { departures?: unknown; arrivals?: unknown; apply?: unknown };
    const dep = parseSuiteList(raw.departures);
    const arr = parseSuiteList(raw.arrivals);
    const today = hotelToday();
    const ids = Array.from(new Set([...dep.suites, ...arr.suites])).sort();
    const plan: { suite: string; summary: string }[] = [];
    let savedAs: string | null = null;
    if (raw.apply === true && ids.length) savedAs = await snapshotBeforeReset("front-desk-list");
    for (const id of ids) {
      await withSuiteLock(id, async () => {
        const room = (await get(id)) ?? toRoom(id, {});
        const change = frontDeskChange(room, { departure: dep.suites.includes(id), arrival: arr.suites.includes(id) }, today);
        if (!change) return;
        plan.push({ suite: id, summary: change.summary });
        if (raw.apply !== true) return;
        const now = new Date().toISOString();
        const next = { ...room, ...change.changes, updatedAt: now, updatedBy: room.updatedBy === "guest" ? "guest" : role };
        next.history = [
          { id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, event: "Front Desk List", details: change.summary, by: actorName(session, body.userName), role, timestamp: now },
          ...(room.history || []),
        ].slice(0, 50);
        await put(id, next);
      });
    }
    const after = raw.apply === true ? await getAll() : null;
    return NextResponse.json({
      ok: true, action: "front_desk_list", applied: raw.apply === true, savedAs, plan,
      invalid: [...dep.invalid, ...arr.invalid],
      ...(after ? { version: after.version, docs: after.docs } : {}),
    });
  }

  if (!body || !Array.isArray(body.suiteIds) || body.suiteIds.length === 0) {
    return NextResponse.json({ error: "suiteIds array required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const userName = actorName(session, body.userName);
  const { get, put, withSuiteLock } = await import("@/lib/store");

  let updatedCount = 0;
  for (const suiteId of body.suiteIds) {
    // Each suite under its own lock, so a board or housekeeper save at the same moment isn't lost.
    await withSuiteLock(suiteId, async () => {
      // A suite nobody has saved yet still gets assigned (it starts from an empty suite).
      if (!/^[1-3](0[1-9]|[12]\d|3[0-2])$/.test(suiteId)) return;
      const existing = (await get(suiteId)) ?? toRoom(suiteId, {});

      const room = { ...existing };
      if (body.action === "batch_assign") {
        room.attendant = body.attendant || null;
        if (body.priority) room.priority = body.priority;
        if (body.instructions !== undefined) room.instructions = body.instructions;
        if (room.status === "dirty" && room.attendant) {
          room.status = "assigned";
        }

        const auditEntry = {
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          event: "Batch Assignment",
          details: `Assigned to ${room.attendant || "Unassigned"}${body.priority ? ` (${body.priority} priority)` : ""}`,
          by: userName,
          role,
          timestamp: now,
        };

        room.history = [auditEntry, ...(room.history || [])].slice(0, 50);
        room.updatedAt = now;
        room.updatedBy = userName;
        await put(suiteId, room);
        updatedCount++;
      }
    });
  }

  // One notification per housekeeper for the whole batch.
  if (body.action === "batch_assign" && body.attendant && updatedCount) {
    const name = body.attendant;
    const list = body.suiteIds.filter((s) => /^[1-3](0[1-9]|[12]\d|3[0-2])$/.test(s)).slice(0, 12).join(", ");
    after(() => notify({ names: [name] }, { title: `${updatedCount} suite${updatedCount === 1 ? "" : "s"} assigned to you`, body: list, url: "/my-rooms", tag: "batch-assign" }).then(() => {}));
  }

  const updated = await getAll();
  return NextResponse.json({
    ok: true,
    action: body.action,
    updatedCount,
    version: updated.version,
    docs: updated.docs,
  });
}


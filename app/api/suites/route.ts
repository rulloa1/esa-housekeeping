import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getAll, getVersion } from "@/lib/store";

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
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  if (!body || !Array.isArray(body.suiteIds) || body.suiteIds.length === 0) {
    return NextResponse.json({ error: "suiteIds array required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const userName = body.userName || "Supervisor";
  const { get, put } = await import("@/lib/store");

  let updatedCount = 0;
  for (const suiteId of body.suiteIds) {
    const existing = await get(suiteId);
    if (!existing) continue;

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

      room.history = [auditEntry, ...(room.history || [])];
      room.updatedAt = now;
      room.updatedBy = userName;
      await put(suiteId, room);
      updatedCount++;
    }
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


import { NextResponse } from "next/server";
import { getRole, isSupervisor } from "@/lib/auth";
import { get, put, remove, withSuiteLock } from "@/lib/store";
import type { Role, RoomDoc, AuditLogEntry, MaintenanceIssue, SupplyRequest } from "@/lib/models";
import { WRITABLE, changesFrom, describeChanges, guestRequestUnseen, tooLarge, validateChanges, type Doc } from "@/lib/suiteDoc";

export const dynamic = "force-dynamic";

const SUITE = /^[1-3](0[1-9]|[12]\d|3[0-2])$/; // 101–132, 201–232, 301–332

async function guard(id: string) {
  const role = await getRole();
  if (!role) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!SUITE.test(id)) return { error: NextResponse.json({ error: "unknown suite" }, { status: 400 }) };
  return { role };
}

// GET /api/suites/:id
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await guard(id);
  if (error) return error;

  const room = await get(id);
  if (!room) return NextResponse.json({ error: "suite not found" }, { status: 404 });
  return NextResponse.json(room);
}

type Body = Partial<RoomDoc> & {
  action?: string;
  userName?: string;
  maintenanceIssue?: MaintenanceIssue;
  supplyRequest?: SupplyRequest;
  failReasons?: string[];
  inspectionCategories?: Record<string, "pass" | "fail" | "na">;
};

const isObj = (v: unknown): v is Doc => typeof v === "object" && v !== null && !Array.isArray(v);

// PUT /api/suites/:id with a structured action ({ action: "start_cleaning", … }) or a partial
// update: only the writable fields present in the body are applied (see WRITABLE in lib/suiteDoc).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, role } = await guard(id);
  if (error || !role) return error!;
  const body = await req.json().catch(() => null);
  if (!isObj(body)) return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  return withSuiteLock(id, () => update(id, role, body as Body, null));
}

// PATCH /api/suites/:id  { base, next }  from the 3D board (public/hk-db.js).
//   base  the copy of the suite the board was editing from (null if it had none)
//   next  the whole suite as the board wants it saved
// Only the fields the board changed are applied, so changes saved meanwhile by someone else
// (a guest request, another iPad, the operations dashboard) are kept.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, role } = await guard(id);
  if (error || !role) return error!;
  const body = await req.json().catch(() => null);
  if (!isObj(body) || !isObj(body.next) || !(body.base === null || isObj(body.base))) {
    return NextResponse.json({ error: "body must be { base, next }" }, { status: 400 });
  }
  return withSuiteLock(id, () => update(id, role, body.next as Body, { base: body.base as Doc | null }));
}

async function update(id: string, role: Role, body: Body, board: { base: Doc | null } | null) {
  const existing = await get(id);
  const now = new Date().toISOString();
  const userName = (typeof body.userName === "string" && body.userName.trim().slice(0, 60)) || (role === "housekeeper" || role === "housekeeping" ? "Housekeeper" : "Supervisor");

  const room: RoomDoc = existing ?? {
    id,
    floor: parseInt(id[0], 10),
    type: "Queen Studio",
    status: "dirty",
    priority: "standard",
    serviceType: "stayover",
    attendant: null,
    supervisor: null,
    guestNote: null,
    instructions: null,
    startedAt: null,
    completedAt: null,
    inspectedAt: null,
    inspectedBy: null,
    inspectionResult: null,
    inspectionNotes: null,
    inspectionFailReasons: [],
    inspectionCategories: {},
    checklist: {},
    checklistNotes: {},
    maintenanceIssues: [],
    supplyRequests: [],
    history: [],
    updatedAt: now,
    updatedBy: role,
  };

  const history: AuditLogEntry[] = Array.isArray(room.history) ? [...room.history] : [];
  const logEvent = (event: string, details: string) => {
    history.unshift({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      event,
      details,
      by: userName,
      role,
      timestamp: now,
    });
  };

  let conflicts: string[] = [];
  const rejected: { field: string; reason: string }[] = [];

  // 1. ACTION-BASED DISPATCH
  if (body.action) {
    switch (body.action) {
      case "start_cleaning": {
        room.status = "in_progress";
        room.startedAt = now;
        if (!room.attendant && body.attendant) room.attendant = body.attendant;
        logEvent("Cleaning Started", `${userName} began cleaning suite.`);
        break;
      }

      case "complete_cleaning": {
        // Enforce operational workflow: completing cleaning moves to awaiting_inspection
        room.status = "awaiting_inspection";
        room.completedAt = now;
        room.checklist = { ...room.checklist, ...(body.checklist || {}) };
        logEvent("Cleaning Completed", `Submitted for supervisor inspection.`);
        break;
      }

      case "inspect_pass": {
        // Enforce security: housekeepers cannot inspect or approve their own rooms
        if (!isSupervisor(role)) {
          return NextResponse.json({ error: "Only supervisors can approve room inspections." }, { status: 403 });
        }
        room.status = "clean";
        room.inspectedAt = now;
        room.inspectedBy = userName;
        room.inspectionResult = "pass";
        room.inspectionNotes = body.inspectionNotes || "Passed all inspection standards.";
        room.inspectionFailReasons = [];
        if (body.inspectionCategories) room.inspectionCategories = body.inspectionCategories;
        logEvent("Inspection Passed", `Approved by ${userName}. Room is clean and ready for guests.`);
        break;
      }

      case "inspect_fail": {
        if (!isSupervisor(role)) {
          return NextResponse.json({ error: "Only supervisors can record inspection failures." }, { status: 403 });
        }
        const reasons = body.failReasons && body.failReasons.length > 0 ? body.failReasons : ["Inspection failed: correction required."];
        room.status = "inspection_failed";
        room.inspectedAt = now;
        room.inspectedBy = userName;
        room.inspectionResult = "fail";
        room.inspectionFailReasons = reasons;
        room.inspectionNotes = body.inspectionNotes || reasons.join("; ");
        if (body.inspectionCategories) room.inspectionCategories = body.inspectionCategories;
        logEvent("Inspection Failed", `Rejected by ${userName}: ${reasons.join(", ")}`);
        break;
      }

      case "assign": {
        if (!isSupervisor(role)) {
          return NextResponse.json({ error: "Only supervisors can assign rooms." }, { status: 403 });
        }
        const oldAttendant = room.attendant;
        room.attendant = body.attendant || null;
        if (body.priority) room.priority = body.priority;
        if (body.instructions) room.instructions = body.instructions;
        if (room.status === "dirty" && room.attendant) room.status = "assigned";
        logEvent("Assignment Updated", `Assigned to ${room.attendant || "Unassigned"} (was ${oldAttendant || "Unassigned"}).`);
        break;
      }

      case "report_maintenance": {
        if (body.maintenanceIssue) {
          const issue: MaintenanceIssue = {
            id: `maint-${Date.now()}`,
            category: body.maintenanceIssue.category || "General",
            description: body.maintenanceIssue.description || "Reported maintenance issue",
            priority: body.maintenanceIssue.priority || "medium",
            reportedBy: userName,
            reportedAt: now,
            status: "open",
            photoUrl: body.maintenanceIssue.photoUrl,
            notes: body.maintenanceIssue.notes,
          };
          room.maintenanceIssues = [...(room.maintenanceIssues || []), issue];
          if (body.maintenanceIssue.priority === "urgent") {
            room.status = "maintenance";
          }
          logEvent("Maintenance Reported", `[${issue.priority.toUpperCase()}] ${issue.category}: ${issue.description}`);
        }
        break;
      }

      case "request_supplies": {
        if (body.supplyRequest) {
          const reqItem: SupplyRequest = {
            id: `sup-${Date.now()}`,
            item: body.supplyRequest.item || "General supplies",
            quantity: Number(body.supplyRequest.quantity) || 1,
            priority: body.supplyRequest.priority || "standard",
            requestedBy: userName,
            requestedAt: now,
            status: "pending",
          };
          room.supplyRequests = [...(room.supplyRequests || []), reqItem];
          logEvent("Supply Request", `Requested ${reqItem.quantity}x ${reqItem.item}`);
        }
        break;
      }

      default:
        logEvent("Update", `Updated room details.`);
    }
  } else {
    // 2. DIRECT UPDATE: the 3D board (PATCH, only what it changed) or a partial PUT.
    let changes: Doc;
    if (board) {
      const merged = changesFrom(existing as Doc | null, board.base, body as Doc);
      changes = merged.changes;
      conflicts = merged.conflicts;
    } else {
      changes = Object.fromEntries(WRITABLE.filter((k) => k in body).map((k) => [k, (body as Doc)[k]]));
    }
    const errors = validateChanges(changes);
    if (errors.length) return NextResponse.json({ error: "invalid suite update", details: errors }, { status: 400 });
    const before = { ...room } as unknown as Doc;
    const supervisor = isSupervisor(role);

    if (changes.status !== undefined && changes.status !== room.status) {
      const status = changes.status as string;
      if (status === "inspected") {
        // The board's "Inspected" is a passed inspection, which only supervisors may record.
        if (!supervisor) rejected.push({ field: "status", reason: "inspect" });
        else {
          room.status = "clean";
          room.inspectedAt = now;
          room.inspectedBy = userName;
          room.inspectionResult = "pass";
          room.inspectionFailReasons = [];
          logEvent("Inspection Passed", `Approved by ${userName} on the building board.`);
        }
      } else if (status === "clean" && !supervisor && existing?.status !== "clean") {
        // Housekeeper trying to set to clean directly: convert to awaiting_inspection
        room.status = "awaiting_inspection";
        room.completedAt = now;
        logEvent("Cleaning Completed", `Submitted for supervisor inspection.`);
      } else {
        logEvent("Status Changed", `Status changed from ${room.status} to ${status}`);
        room.status = status as RoomDoc["status"];
        if (status === "in_progress" && !room.startedAt) room.startedAt = now;
      }
    }
    delete changes.status;

    if (changes.attendant !== undefined) {
      const attendant = (changes.attendant as string | null) || null;
      if (attendant !== room.attendant) logEvent("Attendant Changed", `Attendant set to ${attendant || "None"}`);
      room.attendant = attendant;
      delete changes.attendant;
    }

    // The 3-day DND welfare check is a supervisor's job (Mandatory DND Policy): only a supervisor
    // may tick or untick it. Lifting DND itself clears it too, which anyone may do.
    const liftingDnd = changes.welfareDone === null && "dndSince" in changes && changes.dndSince === null;
    if ("welfareDone" in changes && changes.welfareDone !== ((room as unknown as Doc).welfareDone ?? null) && !supervisor && !liftingDnd) {
      rejected.push({ field: "welfareDone", reason: "welfare" });
      delete changes.welfareDone;
    }

    if (isObj(changes.checklist)) changes.checklist = board ? changes.checklist : { ...room.checklist, ...changes.checklist };
    if (isObj(changes.checklistNotes)) changes.checklistNotes = board ? changes.checklistNotes : { ...room.checklistNotes, ...changes.checklistNotes };
    Object.assign(room, changes);

    const summary = describeChanges(before, room as unknown as Doc);
    if (summary) logEvent(board ? "Board Update" : "Update", summary);
  }

  room.history = history.slice(0, 50); // Keep last 50 audit entries
  if (tooLarge(room)) return NextResponse.json({ error: "suite record too large" }, { status: 400 });
  room.updatedAt = board && typeof body.updatedAt === "string" && body.updatedAt.length <= 40 ? body.updatedAt : now;
  // A guest request the board hadn't seen yet stays open (the board reads updatedBy "guest" as open).
  room.updatedBy = board && guestRequestUnseen(existing as Doc | null, board.base) ? "guest" : role;

  const version = await put(id, room);
  return NextResponse.json({ version, room, conflicts, rejected });
}

// DELETE /api/suites/:id clears the suite
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, role } = await guard(id);
  if (error || !role) return error!;

  if (!isSupervisor(role)) {
    return NextResponse.json({ error: "Only supervisors can reset suite logs.", reason: "clearSuite" }, { status: 403 });
  }

  return withSuiteLock(id, async () => NextResponse.json({ version: await remove(id) }));
}

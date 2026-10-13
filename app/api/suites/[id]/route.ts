import { NextResponse, after } from "next/server";
import { notify } from "@/lib/push";
import { actorName, getSession, isSupervisor, type Session } from "@/lib/auth";
import { get, put, remove, withSuiteLock } from "@/lib/store";
import { isGuestTask, type Role, type RoomDoc, type AuditLogEntry, type MaintenanceIssue, type SupplyRequest } from "@/lib/models";
import { REQUEST_LABEL, type GuestRequest } from "@/lib/guest";
import { WRITABLE, changesFrom, describeChanges, guestRequestUnseen, tooLarge, validateChanges, type Doc } from "@/lib/suiteDoc";

export const dynamic = "force-dynamic";

const SUITE = /^[1-3](0[1-9]|[12]\d|3[0-2])$/; // 101–132, 201–232, 301–332

async function guard(id: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!SUITE.test(id)) return { error: NextResponse.json({ error: "unknown suite" }, { status: 400 }) };
  return { session, role: session.role };
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
  issueId?: string;
  requestId?: string;
  requestAt?: string;
  inspectionCategories?: Record<string, "pass" | "fail" | "na">;
};

const isObj = (v: unknown): v is Doc => typeof v === "object" && v !== null && !Array.isArray(v);

// PUT /api/suites/:id with a structured action ({ action: "start_cleaning", … }) or a partial
// update: only the writable fields present in the body are applied (see WRITABLE in lib/suiteDoc).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await guard(id);
  if (error || !session) return error!;
  const body = await req.json().catch(() => null);
  if (!isObj(body)) return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  return withSuiteLock(id, () => update(id, session, body as Body, null));
}

// PATCH /api/suites/:id  { base, next }  from the 3D board (public/hk-db.js).
//   base  the copy of the suite the board was editing from (null if it had none)
//   next  the whole suite as the board wants it saved
// Only the fields the board changed are applied, so changes saved meanwhile by someone else
// (a guest request, another iPad, the operations dashboard) are kept.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await guard(id);
  if (error || !session) return error!;
  const body = await req.json().catch(() => null);
  if (!isObj(body) || !isObj(body.next) || !(body.base === null || isObj(body.base))) {
    return NextResponse.json({ error: "body must be { base, next }" }, { status: 400 });
  }
  return withSuiteLock(id, () => update(id, session, body.next as Body, { base: body.base as Doc | null }));
}

async function update(id: string, session: Session, body: Body, board: { base: Doc | null } | null) {
  const role: Role = session.role;
  const existing = await get(id);
  const now = new Date().toISOString();
  const userName = actorName(session, body.userName);
  // A housekeeper signed in with their own PIN works on their own suites (or unassigned ones).
  const personalHousekeeper = session.staff && !isSupervisor(role) ? session.staff.name : null;

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

  // Lock-screen notifications to send once the save is done (lib/push.ts).
  const notifyAttendant = (name: string | null, title: string, text: string) => {
    if (name && name !== userName) after(() => notify({ names: [name] }, { title, body: text, url: "/my-rooms", tag: `suite-${id}` }).then(() => {}));
  };

  let conflicts: string[] = [];
  const rejected: { field: string; reason: string }[] = [];

  // 1. ACTION-BASED DISPATCH
  if (body.action) {
    switch (body.action) {
      case "start_cleaning": {
        if (personalHousekeeper && room.attendant && room.attendant !== personalHousekeeper) {
          return NextResponse.json({ error: `This suite is assigned to ${room.attendant}.`, reason: "notYours", attendant: room.attendant }, { status: 403 });
        }
        room.status = "in_progress";
        room.startedAt = now;
        if (!room.attendant) room.attendant = personalHousekeeper || body.attendant || null;
        logEvent("Cleaning Started", `${userName} began cleaning suite.`);
        break;
      }

      case "complete_cleaning": {
        if (personalHousekeeper && room.attendant && room.attendant !== personalHousekeeper) {
          return NextResponse.json({ error: `This suite is assigned to ${room.attendant}.`, reason: "notYours", attendant: room.attendant }, { status: 403 });
        }
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
        notifyAttendant(room.attendant, `Suite ${id} failed inspection`, (room.inspectionFailReasons || []).slice(0, 3).join(", ") || "Tap to see what needs fixing.");
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
        if (room.attendant !== oldAttendant) {
          notifyAttendant(room.attendant, `Suite ${id} assigned to you`, room.priority === "urgent" ? "Urgent. " + (room.instructions || "") : room.instructions || "Tap to see your suites.");
        }
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

      // Closing out what was reported. A suite blocked for maintenance goes back to
      // "dirty" (it needs cleaning after the repair) once its last open issue is resolved.
      case "resolve_maintenance": {
        if (!isSupervisor(role)) {
          return NextResponse.json({ error: "Only supervisors can resolve maintenance issues.", reason: "resolveMaintenance" }, { status: 403 });
        }
        const issue = (room.maintenanceIssues || []).find((m) => m.id === body.issueId);
        if (!issue) return NextResponse.json({ error: "maintenance issue not found" }, { status: 404 });
        if (issue.status !== "resolved") {
          issue.status = "resolved";
          issue.resolvedBy = userName;
          issue.resolvedAt = now;
          logEvent("Maintenance Resolved", `${issue.category}: ${issue.description}`);
          const stillOpen = room.maintenanceIssues.some((m) => m.status !== "resolved");
          if (room.status === "maintenance" && !stillOpen) {
            room.status = "dirty";
            logEvent("Status Changed", "Back in service after maintenance; needs cleaning.");
          }
        }
        break;
      }

      case "fulfill_supplies": {
        if (!isSupervisor(role)) {
          return NextResponse.json({ error: "Only supervisors can mark supplies delivered.", reason: "fulfillSupplies" }, { status: 403 });
        }
        const request = (room.supplyRequests || []).find((r) => r.id === body.requestId);
        if (!request) return NextResponse.json({ error: "supply request not found" }, { status: 404 });
        if (request.status !== "fulfilled") {
          request.status = "fulfilled";
          request.fulfilledBy = userName;
          request.fulfilledAt = now;
          logEvent("Supply Delivered", `${request.quantity}x ${request.item}`);
        }
        break;
      }

      // Any staff member who handled a guest request (towels delivered, room serviced) marks it done.
      case "guest_request_done": {
        const requests = Array.isArray(room.guestRequests) ? room.guestRequests : [];
        const request = requests.find((r) => r.at === body.requestAt && isGuestTask(r.type));
        if (!request) return NextResponse.json({ error: "guest request not found" }, { status: 404 });
        if (!request.doneAt) {
          request.doneAt = now;
          request.doneBy = userName;
          logEvent("Guest Request Done", REQUEST_LABEL[request.type as GuestRequest] ?? request.type);
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
      if (attendant !== room.attendant) {
        logEvent("Attendant Changed", `Attendant set to ${attendant || "None"}`);
        notifyAttendant(attendant, `Suite ${id} assigned to you`, "Tap to see your suites.");
      }
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
  // The board shows a suite's guest request as open while updatedBy is "guest". A board save
  // acknowledges the requests that board had seen; anything else (a dashboard action, another
  // device) leaves the flag up until every guest request is marked done.
  const openGuestRequest = (room.guestRequests || []).some((r) => isGuestTask(r.type) && !r.doneAt);
  room.updatedBy = board
    ? guestRequestUnseen(existing as Doc | null, board.base) ? "guest" : role
    : existing?.updatedBy === "guest" && openGuestRequest ? "guest" : role;

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

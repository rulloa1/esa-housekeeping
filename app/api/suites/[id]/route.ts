import { NextResponse } from "next/server";
import { getRole, isSupervisor } from "@/lib/auth";
import { get, put, remove } from "@/lib/store";
import type { RoomDoc, AuditLogEntry, MaintenanceIssue, SupplyRequest } from "@/lib/models";

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

// PUT /api/suites/:id with document update or structured action
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, role } = await guard(id);
  if (error || !role) return error!;

  const body = (await req.json().catch(() => null)) as Partial<RoomDoc> & {
    action?: string;
    userName?: string;
    maintenanceIssue?: MaintenanceIssue;
    supplyRequest?: SupplyRequest;
    failReasons?: string[];
    inspectionCategories?: Record<string, "pass" | "fail" | "na">;
  };

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }

  const existing = await get(id);
  const now = new Date().toISOString();
  const userName = body.userName || (role === "housekeeper" || role === "housekeeping" ? "Housekeeper" : "Supervisor");

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
    // 2. DIRECT DOCUMENT UPDATE (Backwards compatible with board/housekeeping.html)
    // Enforce business rules on direct status updates:
    if (body.status === "clean" && !isSupervisor(role) && existing?.status !== "clean") {
      // Housekeeper trying to set to clean directly: convert to awaiting_inspection
      room.status = "awaiting_inspection";
      room.completedAt = now;
      logEvent("Cleaning Completed", `Submitted for supervisor inspection.`);
    } else {
      if (body.status && body.status !== room.status) {
        logEvent("Status Changed", `Status changed from ${room.status} to ${body.status}`);
        room.status = body.status;
      }
    }

    if (body.attendant !== undefined) {
      if (body.attendant !== room.attendant) {
        logEvent("Attendant Changed", `Attendant set to ${body.attendant || "None"}`);
      }
      room.attendant = body.attendant;
    }

    if (body.priority) room.priority = body.priority;
    if (body.serviceType) room.serviceType = body.serviceType;
    if (body.instructions !== undefined) room.instructions = body.instructions;
    if (body.guestNote !== undefined) room.guestNote = body.guestNote;
    if (body.checklist) room.checklist = { ...room.checklist, ...body.checklist };
    if (body.checklistNotes) room.checklistNotes = { ...room.checklistNotes, ...body.checklistNotes };
    if (body.inspectionCategories) room.inspectionCategories = body.inspectionCategories;
    if (body.inspectionNotes !== undefined) room.inspectionNotes = body.inspectionNotes;
    if (body.inspectionFailReasons) room.inspectionFailReasons = body.inspectionFailReasons;
  }

  room.history = history.slice(0, 50); // Keep last 50 audit entries
  room.updatedAt = now;
  room.updatedBy = role;

  const version = await put(id, room);
  return NextResponse.json({ version, room });
}

// DELETE /api/suites/:id clears the suite
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, role } = await guard(id);
  if (error || !role) return error!;

  if (!isSupervisor(role)) {
    return NextResponse.json({ error: "Only supervisors can reset suite logs." }, { status: 403 });
  }

  const version = await remove(id);
  return NextResponse.json({ version });
}

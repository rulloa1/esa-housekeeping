// Suites saved by the 3D board carry only the board's fields (no id, type, priority, history…),
// and older board data can hold statuses the dashboard doesn't know ("inspected", none at all).
// The dashboard and housekeeper views read every suite through this, so a board-only suite shows
// with sensible defaults instead of crashing the page.
import type { RoomDoc, RoomStatus, SuiteDocs } from "@/lib/models";

const STATUSES: RoomStatus[] = ["dirty", "assigned", "in_progress", "awaiting_inspection", "inspection_failed", "clean", "maintenance", "ooo"];
const PRIORITIES = ["urgent", "high", "standard", "low"];
const SERVICE = ["turnover", "stayover", "touchup"];
const TYPES = ["Queen Studio", "King Suite", "Double Queen", "Deluxe Studio"];

const str = (v: unknown, fallback: string) => (typeof v === "string" && v ? v : fallback);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = <T>(v: unknown): Record<string, T> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : {});

export function toRoom(id: string, raw: unknown): RoomDoc {
  const d = obj<unknown>(raw);
  const status = d.status === "inspected" ? "clean" : STATUSES.includes(d.status as RoomStatus) ? (d.status as RoomStatus) : "dirty";
  const occ = d.occ;
  return {
    ...(d as Partial<RoomDoc>),
    id,
    floor: typeof d.floor === "number" ? d.floor : Number(id[0]) || 1,
    type: (TYPES.includes(d.type as string) ? d.type : "Queen Studio") as RoomDoc["type"],
    status,
    priority: (PRIORITIES.includes(d.priority as string) ? d.priority : "standard") as RoomDoc["priority"],
    serviceType: (SERVICE.includes(d.serviceType as string) ? d.serviceType : occ === "checkout" ? "turnover" : "stayover") as RoomDoc["serviceType"],
    attendant: typeof d.attendant === "string" && d.attendant ? d.attendant : null,
    supervisor: typeof d.supervisor === "string" ? d.supervisor : null,
    guestNote: typeof d.guestNote === "string" ? d.guestNote : null,
    instructions: typeof d.instructions === "string" ? d.instructions : null,
    startedAt: typeof d.startedAt === "string" ? d.startedAt : null,
    completedAt: typeof d.completedAt === "string" ? d.completedAt : null,
    inspectedAt: typeof d.inspectedAt === "string" ? d.inspectedAt : null,
    inspectedBy: typeof d.inspectedBy === "string" ? d.inspectedBy : null,
    inspectionResult: d.inspectionResult === "pass" || d.inspectionResult === "fail" ? d.inspectionResult : d.status === "inspected" ? "pass" : null,
    inspectionNotes: typeof d.inspectionNotes === "string" ? d.inspectionNotes : null,
    inspectionFailReasons: arr<string>(d.inspectionFailReasons),
    inspectionCategories: obj<"pass" | "fail" | "na">(d.inspectionCategories),
    checklist: obj<boolean>(d.checklist),
    checklistNotes: obj<string>(d.checklistNotes),
    maintenanceIssues: arr(d.maintenanceIssues),
    supplyRequests: arr(d.supplyRequests),
    guestRequests: arr(d.guestRequests),
    history: arr(d.history),
    updatedAt: str(d.updatedAt, ""),
    updatedBy: str(d.updatedBy, ""),
  };
}

export function toRooms(docs: Record<string, unknown>): SuiteDocs {
  const out: SuiteDocs = {};
  for (const [id, d] of Object.entries(docs || {})) out[id] = toRoom(id, d);
  return out;
}

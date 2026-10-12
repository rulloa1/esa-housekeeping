// Board saves: turning a save made from an older copy of a suite into just the changes that
// device made, and checking those changes before they're stored. Used by PATCH /api/suites/:id.

export type Doc = Record<string, unknown>;

// Statuses the operations platform uses, plus "inspected", which the 3D board still writes.
export const STATUSES = [
  "dirty", "assigned", "in_progress", "awaiting_inspection", "inspection_failed", "clean", "maintenance", "ooo", "inspected",
] as const;
const OCCUPANCY = ["occupied", "checkout", "vacant"];
const PRIORITIES = ["urgent", "high", "standard", "low"];
const SERVICE_TYPES = ["turnover", "stayover", "touchup"];
export const MAX_DOC_BYTES = 64 * 1024;
const MAX_TEXT = 4000;
const MAX_NAME = 80;

// Fields a staff device may change directly. Everything else on a suite (history, maintenance
// issues, supply requests, guest requests, inspection results, timestamps) changes only through
// the server's own actions, so a stale copy sent by a device can never overwrite it.
export const WRITABLE = [
  // 3D board
  "status", "occ", "lastFull", "dndSince", "welfareDone", "audit", "tasks", "attendant", "notes", "example",
  // operations platform
  "priority", "serviceType", "instructions", "guestNote", "checklist", "checklistNotes",
  "inspectionCategories", "inspectionNotes", "inspectionFailReasons",
] as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (v: unknown): v is Doc => typeof v === "object" && v !== null && !Array.isArray(v);
const isDate = (v: unknown) => v === null || (typeof v === "string" && DATE.test(v));
const isText = (max: number) => (v: unknown) => v === null || (typeof v === "string" && v.length <= max);
const isMapOf = (test: (x: unknown) => boolean) => (v: unknown) => v === null || (isObj(v) && Object.values(v).every(test));
const oneOf = (list: readonly string[]) => (v: unknown) => typeof v === "string" && list.includes(v);

const CHECKS: Record<string, (v: unknown) => boolean> = {
  status: oneOf(STATUSES),
  occ: oneOf(OCCUPANCY),
  lastFull: isDate,
  dndSince: isDate,
  welfareDone: isDate,
  audit: isMapOf((x) => typeof x === "boolean"),
  tasks: (v) => v === null || (isObj(v) && isDate(v.date ?? null) && (v.done === undefined || isMapOf((x) => typeof x === "boolean")(v.done))),
  attendant: isText(MAX_NAME),
  notes: isText(MAX_TEXT),
  example: (v) => typeof v === "boolean",
  priority: oneOf(PRIORITIES),
  serviceType: oneOf(SERVICE_TYPES),
  instructions: isText(MAX_TEXT),
  guestNote: isText(MAX_TEXT),
  checklist: isMapOf((x) => typeof x === "boolean"),
  checklistNotes: isMapOf(isText(MAX_TEXT)),
  inspectionCategories: isMapOf(oneOf(["pass", "fail", "na"])),
  inspectionNotes: isText(MAX_TEXT),
  inspectionFailReasons: (v) => Array.isArray(v) && v.length <= 20 && v.every(isText(500)),
};

// Problems with a set of field changes; empty means they can be applied.
export function validateChanges(changes: Doc): string[] {
  const errors: string[] = [];
  for (const [k, v] of Object.entries(changes)) {
    const check = CHECKS[k];
    if (check && !check(v)) errors.push(`${k}: not an accepted value`);
  }
  return errors;
}

export function tooLarge(doc: unknown): boolean {
  return JSON.stringify(doc).length > MAX_DOC_BYTES;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Three-way merge of plain objects (audit checks, ticked tasks, checklist): what changed from
// `base` to `next`, applied key by key onto `current`.
function mergeObject(current: Doc, base: Doc, next: Doc): Doc {
  const out: Doc = { ...current };
  for (const k of new Set([...Object.keys(base), ...Object.keys(next)])) {
    if (same(base[k], next[k])) continue;
    if (isObj(base[k]) && isObj(next[k]) && isObj(current[k])) out[k] = mergeObject(current[k] as Doc, base[k] as Doc, next[k] as Doc);
    else if (next[k] === undefined) delete out[k];
    else out[k] = next[k];
  }
  return out;
}

export type Changes = { changes: Doc; conflicts: string[] };

// The writable fields this device changed between `base` (the copy it started from, null if it
// had none) and `next` (what it wants saved), resolved against `current` (what is stored now):
//   - fields the device didn't touch are left out, so changes made meanwhile by others survive
//   - nested objects merge key by key, so two devices ticking different boxes both count
//   - lines added to notes meanwhile (usually "Guest: …") are kept above this device's notes
//   - a field both sides changed takes this device's value and is listed in `conflicts`
export function changesFrom(current: Doc | null, base: Doc | null, next: Doc): Changes {
  const cur = current ?? {}, b = base ?? {};
  const changes: Doc = {};
  const conflicts: string[] = [];
  for (const k of WRITABLE) {
    if (same(b[k], next[k])) continue;
    if (isObj(b[k]) && isObj(next[k]) && isObj(cur[k])) {
      changes[k] = mergeObject(cur[k] as Doc, b[k] as Doc, next[k] as Doc);
      continue;
    }
    let value = next[k] === undefined ? null : next[k];
    if (k === "notes" && typeof cur.notes === "string" && cur.notes !== (b.notes ?? "")) {
      const have = new Set(String(value ?? "").split("\n"));
      const baseLines = new Set(String(b.notes ?? "").split("\n"));
      const added = cur.notes.split("\n").filter((l) => l && !baseLines.has(l) && !have.has(l));
      if (added.length) value = [...added, value].filter(Boolean).join("\n").slice(0, MAX_TEXT);
    } else if (!same(cur[k], b[k]) && !same(cur[k], value)) {
      conflicts.push(k);
    }
    changes[k] = value;
  }
  return { changes, conflicts };
}

type GuestRequest = { type: string; at: string };
const newestRequest = (d: Doc | null | undefined) =>
  (Array.isArray(d?.guestRequests) ? (d!.guestRequests as GuestRequest[]) : []).reduce((m, r) => (r.at > m ? r.at : m), "");

// A guest request the device hadn't seen when it saved stays open on the board
// (the board treats a suite as having an open request while updatedBy is "guest").
export function guestRequestUnseen(current: Doc | null, base: Doc | null): boolean {
  return current?.updatedBy === "guest" && newestRequest(current) > newestRequest(base);
}

// Readable names for the history line written when the board changes a suite.
const LABELS: Record<string, string> = {
  occ: "occupancy", lastFull: "last full service", dndSince: "Do Not Disturb", welfareDone: "welfare check",
  audit: "kitchenette audit", tasks: "service tasks", notes: "notes", example: "sample flag", priority: "priority",
  serviceType: "service type", instructions: "instructions", guestNote: "guest note", checklist: "checklist",
  checklistNotes: "checklist notes", inspectionCategories: "inspection categories", inspectionNotes: "inspection notes",
  inspectionFailReasons: "inspection fail reasons",
};

export function describeChanges(before: Doc, after: Doc): string | null {
  const names = Object.keys(LABELS).filter((k) => !same(before[k], after[k])).map((k) => LABELS[k]);
  return names.length ? `Updated ${names.join(", ")}.` : null;
}

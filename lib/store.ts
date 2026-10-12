// Extended Stay America Suites — Houston IAH Airport
// Enterprise Store with Redis TCP, Upstash REST, and In-Memory Fallback
import { createClient } from "redis";
import type { RoomDoc, SuiteDocs, RoomStatus, RoomPriority, ServiceType } from "./models";
import { STAFF_ATTENDANTS, DEFAULT_CHECKLIST_TEMPLATE } from "./models";

export type { SuiteDocs };

const redisUrl = process.env.REDIS_URL;
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const TIMEOUT_MS = 8000;
const DOCS_KEY = "hk:suites";
const VERSION_KEY = "hk:version";

export const usingRedis = Boolean(redisUrl || (url && token));

// One connection per server instance, opened on first use and reused across requests.
type TcpClient = ReturnType<typeof createClient>;
const g = globalThis as unknown as { __hkRedis?: Promise<TcpClient> };
function tcp(): Promise<TcpClient> {
  g.__hkRedis ??= (async () => {
    const client = createClient({ url: redisUrl, socket: { connectTimeout: TIMEOUT_MS } });
    client.on("error", (err) => console.error("redis", err));
    await client.connect();
    return client;
  })().catch((err) => { g.__hkRedis = undefined; throw err; });
  return g.__hkRedis;
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Redis timed out")), TIMEOUT_MS);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

type Command = (string | number)[];
type Reply = { result?: unknown; error?: string };

async function call(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(url! + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json()) as Reply | Reply[];
  if (!res.ok || (!Array.isArray(json) && json.error)) {
    throw new Error((!Array.isArray(json) && json.error) || `Redis HTTP ${res.status}`);
  }
  return json;
}

async function redis(...command: Command): Promise<unknown> {
  if (redisUrl) return withTimeout(tcp().then((c) => c.sendCommand(command.map(String))));
  return ((await call("", command)) as Reply).result;
}

async function transaction(...commands: Command[]): Promise<unknown> {
  if (redisUrl) {
    const results = await withTimeout(tcp().then((client) => {
      const multi = client.multi();
      for (const c of commands) multi.addCommand(c.map(String));
      return multi.exec();
    }));
    return results[results.length - 1];
  }
  const replies = (await call("/multi-exec", commands)) as Reply[];
  const failed = replies.find((r) => r.error);
  if (failed) throw new Error(failed.error);
  return replies[replies.length - 1].result;
}

// In-Memory store for development
const memory = globalThis as unknown as { __hkDocs?: Map<string, string>; __hkVersion?: number };
memory.__hkDocs ??= new Map();
memory.__hkVersion ??= 0;

// Seed Generator for all 96 Suites at Houston IAH Airport (Floors 1 to 3, 32 suites per floor)
export function generateDefaultSuites(): SuiteDocs {
  const docs: SuiteDocs = {};
  const now = new Date().toISOString();

  for (let f = 1; f <= 3; f++) {
    for (let r = 1; r <= 32; r++) {
      const id = `${f}${r.toString().padStart(2, "0")}`;
      const num = f * 100 + r;

      // Deterministic realistic initial setup
      let type: RoomDoc["type"] = "Queen Studio";
      if (r % 4 === 1) type = "King Suite";
      else if (r % 4 === 2) type = "Double Queen";
      else if (r % 4 === 3) type = "Deluxe Studio";

      let status: RoomStatus = "clean";
      let priority: RoomPriority = "standard";
      let serviceType: ServiceType = "stayover";
      let attendant: string | null = null;
      let instructions: string | null = null;
      let guestNote: string | null = null;
      let startedAt: string | null = null;
      let completedAt: string | null = null;
      let inspectedAt: string | null = now;
      let inspectedBy: string | null = "Supervisor Sarah J.";
      let inspectionResult: "pass" | "fail" | null = "pass";
      const inspectionCategories: Record<string, "pass" | "fail" | "na"> = {
        bedroom: "pass",
        bathroom: "pass",
        kitchenette: "pass",
        floors: "pass",
        supplies: "pass",
        presentation: "pass",
        safety: "pass",
      };
      const checklist: Record<string, boolean> = {};
      DEFAULT_CHECKLIST_TEMPLATE.forEach((i) => {
        checklist[i.id] = true;
      });

      const attendantIndex = (f * 10 + r) % STAFF_ATTENDANTS.length;
      const assignedAttendant = STAFF_ATTENDANTS[attendantIndex];

      // Distribution across 96 rooms:
      // ~10 Dirty Checkout, ~8 Dirty Stayover, ~12 Assigned, ~8 In Progress, ~6 Awaiting Inspection, ~3 Inspection Failed, ~3 Maintenance, ~2 OOO, rest Clean
      if (num === 101 || num === 105 || num === 203 || num === 215 || num === 301 || num === 317) {
        status = "awaiting_inspection";
        serviceType = "turnover";
        priority = "urgent";
        attendant = assignedAttendant;
        instructions = "Check out turnover. Front desk prioritized for 2 PM check-in.";
        startedAt = new Date(Date.now() - 45 * 60 * 1000).toISOString();
        completedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        inspectedAt = null;
        inspectedBy = null;
        inspectionResult = null;
      } else if (num === 108 || num === 220 || num === 309) {
        status = "inspection_failed";
        serviceType = "stayover";
        priority = "high";
        attendant = assignedAttendant;
        instructions = "Correction needed: Bathroom mirror streaked, re-vacuum entryway.";
        startedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        completedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        inspectedAt = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        inspectedBy = "Supervisor Sarah J.";
        inspectionResult = "fail";
        inspectionCategories.bathroom = "fail";
        inspectionCategories.floors = "fail";
      } else if (num === 102 || num === 114 || num === 204 || num === 212 || num === 302 || num === 322) {
        status = "in_progress";
        serviceType = r % 2 === 0 ? "turnover" : "stayover";
        priority = "high";
        attendant = assignedAttendant;
        startedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
        inspectedAt = null;
        inspectedBy = null;
        inspectionResult = null;
        // Partially completed checklist
        DEFAULT_CHECKLIST_TEMPLATE.forEach((i, idx) => {
          checklist[i.id] = idx < 6;
        });
      } else if (num === 103 || num === 119 || num === 207 || num === 225 || num === 305 || num === 328) {
        status = "assigned";
        serviceType = "stayover";
        priority = "standard";
        attendant = assignedAttendant;
        instructions = "Weekly refresh. Guest requested extra coffee & towels.";
        guestNote = "Please do not vacuum before 11:00 AM";
        inspectedAt = null;
        inspectedBy = null;
        inspectionResult = null;
        DEFAULT_CHECKLIST_TEMPLATE.forEach((i) => {
          checklist[i.id] = false;
        });
      } else if (num === 106 || num === 124 || num === 210 || num === 228 || num === 307 || num === 319) {
        status = "dirty";
        serviceType = "turnover";
        priority = num === 106 || num === 307 ? "urgent" : "standard";
        attendant = null;
        instructions = "Guest checked out at 9:30 AM. Vacant dirty.";
        inspectedAt = null;
        inspectedBy = null;
        inspectionResult = null;
        DEFAULT_CHECKLIST_TEMPLATE.forEach((i) => {
          checklist[i.id] = false;
        });
      } else if (num === 112 || num === 218) {
        status = "maintenance";
        priority = "urgent";
        attendant = null;
        instructions = num === 112 ? "PTAC AC unit leaking onto carpet." : "Bathroom sink drain clogged.";
        inspectedAt = null;
        inspectedBy = null;
        inspectionResult = null;
      } else if (num === 330) {
        status = "ooo";
        priority = "low";
        attendant = null;
        instructions = "Out of order: Kitchenette cabinet hinge replacement pending.";
        inspectedAt = null;
        inspectedBy = null;
        inspectionResult = null;
      }

      const maintenanceIssues = status === "maintenance" ? [
        {
          id: `maint-${num}-1`,
          category: num === 112 ? "HVAC & Thermostat" : "Plumbing (Leak, Toilet, Drain)",
          description: num === 112 ? "PTAC unit dripping condensation into carpet" : "Sink drain clogged completely, slow drain",
          priority: "urgent" as const,
          reportedBy: "Supervisor Sarah J.",
          reportedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
          status: "open" as const,
        }
      ] : [];

      docs[id] = {
        id,
        floor: f,
        type,
        status,
        priority,
        serviceType,
        attendant,
        supervisor: "Supervisor Sarah J.",
        guestNote,
        instructions,
        startedAt,
        completedAt,
        inspectedAt,
        inspectedBy,
        inspectionResult,
        inspectionNotes: status === "inspection_failed" ? "Failed inspection: bathroom mirror and entryway carpet." : null,
        inspectionFailReasons: status === "inspection_failed" ? ["Bathroom mirror streaked", "Carpet needs re-vacuuming"] : [],
        inspectionCategories,
        checklist,
        checklistNotes: {},
        maintenanceIssues,
        supplyRequests: [],
        history: [
          {
            id: `hist-${num}-init`,
            event: "System Baseline",
            details: `Suite configured as ${type} (${status}).`,
            by: "System",
            role: "system",
            timestamp: now,
          }
        ],
        updatedAt: now,
        updatedBy: "system",
      };
    }
  }

  return docs;
}

export async function getVersion(): Promise<number> {
  if (!usingRedis) return memory.__hkVersion!;
  return Number((await redis("GET", VERSION_KEY)) ?? 0);
}

export async function getAll(): Promise<{ version: number; docs: SuiteDocs }> {
  if (!usingRedis) {
    if (!memory.__hkDocs || memory.__hkDocs.size === 0) {
      // Auto-seed in-memory store
      const defaults = generateDefaultSuites();
      for (const [id, doc] of Object.entries(defaults)) {
        memory.__hkDocs!.set(id, JSON.stringify(doc));
      }
      memory.__hkVersion = 1;
    }
    const docs: SuiteDocs = {};
    for (const [id, raw] of memory.__hkDocs!) docs[id] = JSON.parse(raw);
    return { version: memory.__hkVersion!, docs };
  }

  const [version, flat] = await Promise.all([getVersion(), redis("HGETALL", DOCS_KEY)]);
  const list = (flat as string[] | null) ?? [];

  if (list.length === 0) {
    // Auto-seed Redis
    const defaults = generateDefaultSuites();
    const commands: Command[] = [];
    for (const [id, doc] of Object.entries(defaults)) {
      commands.push(["HSET", DOCS_KEY, id, JSON.stringify(doc)]);
    }
    commands.push(["INCR", VERSION_KEY]);
    await transaction(...commands);
    return { version: 1, docs: defaults };
  }

  const docs: SuiteDocs = {};
  for (let i = 0; i < list.length; i += 2) docs[list[i]] = JSON.parse(list[i + 1]);
  return { version, docs };
}

export async function get(id: string): Promise<RoomDoc | null> {
  const raw = usingRedis ? ((await redis("HGET", DOCS_KEY, id)) as string | null) : memory.__hkDocs?.get(id);
  return raw ? JSON.parse(raw) : null;
}

export async function put(id: string, doc: unknown): Promise<number> {
  const raw = JSON.stringify(doc);
  if (!usingRedis) {
    memory.__hkDocs!.set(id, raw);
    return ++memory.__hkVersion!;
  }
  return Number(await transaction(["HSET", DOCS_KEY, id, raw], ["INCR", VERSION_KEY]));
}

export async function remove(id: string): Promise<number> {
  if (!usingRedis) {
    memory.__hkDocs!.delete(id);
    return ++memory.__hkVersion!;
  }
  return Number(await transaction(["HDEL", DOCS_KEY, id], ["INCR", VERSION_KEY]));
}

export async function resetToDefault(): Promise<number> {
  const defaults = generateDefaultSuites();
  if (!usingRedis) {
    memory.__hkDocs!.clear();
    for (const [id, doc] of Object.entries(defaults)) {
      memory.__hkDocs!.set(id, JSON.stringify(doc));
    }
    return ++memory.__hkVersion!;
  }
  const commands: Command[] = [["DEL", DOCS_KEY]];
  for (const [id, doc] of Object.entries(defaults)) {
    commands.push(["HSET", DOCS_KEY, id, JSON.stringify(doc)]);
  }
  commands.push(["INCR", VERSION_KEY]);
  return Number(await transaction(...commands));
}

// Shared suite storage. Uses Upstash Redis (REST) when configured, otherwise an
// in-memory map that only lasts for the life of one server process (local dev).

export type SuiteDocs = Record<string, unknown>;

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const DOCS_KEY = "hk:suites";
const VERSION_KEY = "hk:version";

export const usingRedis = Boolean(url && token);

async function redis(...command: (string | number)[]): Promise<unknown> {
  const res = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || json.error) throw new Error(json.error ?? `Redis HTTP ${res.status}`);
  return json.result;
}

const memory = globalThis as unknown as { __hkDocs?: Map<string, string>; __hkVersion?: number };
memory.__hkDocs ??= new Map();
memory.__hkVersion ??= 0;

export async function getVersion(): Promise<number> {
  if (!usingRedis) return memory.__hkVersion!;
  return Number((await redis("GET", VERSION_KEY)) ?? 0);
}

export async function getAll(): Promise<{ version: number; docs: SuiteDocs }> {
  if (!usingRedis) {
    const docs: SuiteDocs = {};
    for (const [id, raw] of memory.__hkDocs!) docs[id] = JSON.parse(raw);
    return { version: memory.__hkVersion!, docs };
  }
  const [version, flat] = await Promise.all([getVersion(), redis("HGETALL", DOCS_KEY)]);
  const docs: SuiteDocs = {};
  const list = (flat as string[] | null) ?? [];
  for (let i = 0; i < list.length; i += 2) docs[list[i]] = JSON.parse(list[i + 1]);
  return { version, docs };
}

export async function put(id: string, doc: unknown): Promise<number> {
  const raw = JSON.stringify(doc);
  if (!usingRedis) {
    memory.__hkDocs!.set(id, raw);
    return ++memory.__hkVersion!;
  }
  await redis("HSET", DOCS_KEY, id, raw);
  return Number(await redis("INCR", VERSION_KEY));
}

export async function remove(id: string): Promise<number> {
  if (!usingRedis) {
    memory.__hkDocs!.delete(id);
    return ++memory.__hkVersion!;
  }
  await redis("HDEL", DOCS_KEY, id);
  return Number(await redis("INCR", VERSION_KEY));
}

// Shared suite storage, in order of preference:
//   REDIS_URL           a Redis connection string (Vercel's Redis integration)
//   KV_REST_API_*       Upstash Redis over REST
//   neither             an in-memory map that lasts for one server process (local dev)
import { createClient } from "redis";

export type SuiteDocs = Record<string, unknown>;

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

// Rejects if a Redis reply takes longer than TIMEOUT_MS, so a stalled connection can't
// hang a request. Covers both single commands and MULTI/EXEC on the TCP client.
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

// Runs the commands as one MULTI/EXEC transaction, so a write and its version bump
// land together or not at all. Returns the last command's result.
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

export async function get(id: string): Promise<Record<string, unknown> | null> {
  const raw = usingRedis ? ((await redis("HGET", DOCS_KEY, id)) as string | null) : memory.__hkDocs!.get(id);
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

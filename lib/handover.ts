// Extended Stay America Suites — Houston IAH Airport
// Shift handover log ("pass-down log"): short notes one shift leaves for the next. One Redis hash,
// hk:handover (note id -> JSON). Notes older than KEEP_DAYS are dropped when a new note is added.
// Guest names, phone numbers and card details don't belong here; the page says so.
import { randomBytes } from "node:crypto";
import { hashGet, hashGetAll, hashWrite } from "./store";
import { KEEP_DAYS, TOPICS, type HandoverNote, type Topic } from "./handoverShared";

export { KEEP_DAYS, TOPICS, type HandoverNote, type Topic };

const KEY = "hk:handover";
const SUITE = /^[1-3](0[1-9]|[12]\d|3[0-2])$/;

export class HandoverError extends Error {
  constructor(public reason: string, public status = 400) { super(reason); }
}

export function newNote(input: Record<string, unknown>, by: string, role: string, now = new Date()): HandoverNote {
  const text = typeof input.text === "string" ? input.text.trim().slice(0, 500) : "";
  if (text.length < 2) throw new HandoverError("text");
  const suite = typeof input.suite === "string" ? input.suite.trim() : "";
  if (suite && !SUITE.test(suite)) throw new HandoverError("suite");
  return {
    id: `ho-${now.getTime().toString(36)}-${randomBytes(3).toString("hex")}`,
    text,
    topic: TOPICS.includes(input.topic as Topic) ? (input.topic as Topic) : "Other",
    important: input.important === true,
    suite: suite || null,
    by,
    role,
    at: now.toISOString(),
  };
}

export async function listNotes(): Promise<HandoverNote[]> {
  const out: HandoverNote[] = [];
  for (const json of Object.values(await hashGetAll(KEY))) {
    try { out.push(JSON.parse(json)); } catch {}
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export async function addNote(note: HandoverNote, now = Date.now()): Promise<void> {
  const cutoff = now - KEEP_DAYS * 86_400_000;
  const old = (await listNotes()).filter((n) => Date.parse(n.at) < cutoff);
  await hashWrite([
    ...old.map((n) => ({ key: KEY, field: n.id, value: null })),
    { key: KEY, field: note.id, value: JSON.stringify(note) },
  ]);
}

// Mark handled (done = true) or reopen.
export async function setDone(id: unknown, done: boolean, by: string): Promise<HandoverNote> {
  if (typeof id !== "string") throw new HandoverError("id");
  const raw = await hashGet(KEY, id);
  if (!raw) throw new HandoverError("notFound", 404);
  const note = JSON.parse(raw) as HandoverNote;
  if (done) { note.doneBy = by; note.doneAt = new Date().toISOString(); }
  else { delete note.doneBy; delete note.doneAt; }
  await hashWrite([{ key: KEY, field: id, value: JSON.stringify(note) }]);
  return note;
}

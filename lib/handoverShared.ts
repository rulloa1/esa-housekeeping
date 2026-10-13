// Extended Stay America Suites — Houston IAH Airport
// Shift handover log: the parts the browser also needs. Server code is in lib/handover.ts.
export const TOPICS = ["Front desk", "Housekeeping", "Maintenance", "Guests", "Other"] as const;
export type Topic = (typeof TOPICS)[number];
export const KEEP_DAYS = 30;

export interface HandoverNote {
  id: string;
  text: string;
  topic: Topic;
  important: boolean;
  suite: string | null;
  by: string;
  role: string;
  at: string;          // ISO
  doneBy?: string;     // set when a supervisor marks it handled
  doneAt?: string;
}

// Open notes the incoming shift should read: not handled yet, from the last `hours` hours,
// important ones first.
export function openNotes(notes: HandoverNote[], now = Date.now(), hours = 24): HandoverNote[] {
  return notes
    .filter((n) => !n.doneAt && now - Date.parse(n.at) <= hours * 3_600_000)
    .sort((a, b) => Number(b.important) - Number(a.important) || b.at.localeCompare(a.at));
}

// Extended Stay America Suites — Houston IAH Airport
// Lost & found: the parts the browser also needs (types, places, hold period). Server code is in
// lib/lostFound.ts.
export const HOLD_DAYS = 90; // usual hold before an unclaimed item may be disposed of or donated

export const LOST_STATUSES = ["held", "returned", "disposed"] as const;
export type LostStatus = (typeof LOST_STATUSES)[number];

export const PLACES = ["Suite", "Lobby", "Breakfast area", "Laundry", "Pool & courtyard", "Parking lot", "Hallway / stairs", "Other"] as const;

export interface LostItem {
  id: string;
  description: string;
  place: string;          // one of PLACES
  suite: string | null;   // when found in a suite
  foundBy: string;
  foundAt: string;        // ISO
  photoUrl?: string;
  storedAt?: string;      // where it's kept, e.g. "Front desk drawer 2"
  valuable: boolean;      // wallet, phone, ID, jewelry: kept locked, manager informed
  status: LostStatus;
  closedBy?: string;
  closedAt?: string;
  closeNote?: string;
}


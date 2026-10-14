// Extended Stay America Suites — Houston IAH Airport
// Domain Models & Types

export type Role = "housekeeper" | "supervisor" | "admin" | "housekeeping" | "frontdesk";

export type RoomStatus =
  | "dirty"
  | "assigned"
  | "in_progress"
  | "awaiting_inspection"
  | "inspection_failed"
  | "clean"
  | "maintenance"
  | "ooo"
  // Display only: a suite with nothing saved yet (the board shows it as "Not logged"). Never stored.
  | "not_logged";

export type RoomPriority = "urgent" | "high" | "standard" | "low";

export type ServiceType = "turnover" | "stayover" | "touchup";

export interface ChecklistItem {
  id: string;
  category: "bedroom" | "bathroom" | "kitchenette" | "final_check";
  label: string;
  mandatory: boolean;
}

export interface MaintenanceIssue {
  id: string;
  category: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  reportedBy: string;
  reportedAt: string;
  status: "open" | "assigned" | "in_progress" | "resolved";
  photoUrl?: string;
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface SupplyRequest {
  id: string;
  item: string;
  quantity: number;
  priority: "urgent" | "high" | "standard";
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "fulfilled";
  fulfilledBy?: string;
  fulfilledAt?: string;
}

// A request sent from the guest page (lib/guest.ts). It stays open until staff mark it done.
export interface GuestRequestEntry {
  type: string;
  at: string;
  doneAt?: string;
  doneBy?: string;
}

// Requests someone has to act on. DND on/off just changes the suite's sign, so there's nothing to mark done.
export const isGuestTask = (type: string) => type === "cleaning" || type === "towels" || type === "amenities";

export interface AuditLogEntry {
  id: string;
  event: string;
  details: string;
  by: string;
  role: string;
  timestamp: string;
}

export interface InspectionRecord {
  inspectedAt: string;
  inspectedBy: string;
  result: "pass" | "fail";
  categories: Record<string, "pass" | "fail" | "na">;
  notes?: string;
  failReasons?: string[];
}

export interface RoomDoc {
  id: string; // "101" to "332"
  floor: number; // 1, 2, 3
  type: "Queen Studio" | "King Suite" | "Double Queen" | "Deluxe Studio" | string;
  status: RoomStatus;
  priority: RoomPriority;
  serviceType: ServiceType;
  attendant: string | null;
  supervisor: string | null;
  guestNote: string | null;
  instructions: string | null;
  startedAt: string | null;
  completedAt: string | null;
  inspectedAt: string | null;
  inspectedBy: string | null;
  inspectionResult: "pass" | "fail" | null;
  inspectionNotes: string | null;
  inspectionFailReasons: string[];
  inspectionPhotoUrl?: string | null; // a photo of what failed (lib/photos.ts)
  inspectionCategories: Record<string, "pass" | "fail" | "na">;
  checklist: Record<string, boolean>;
  checklistNotes: Record<string, string>;
  maintenanceIssues: MaintenanceIssue[];
  supplyRequests: SupplyRequest[];
  guestRequests?: GuestRequestEntry[];
  history: AuditLogEntry[];
  updatedAt: string;
  updatedBy: string;
  // Keyless digital entry system fields
  lastUnlockedAt?: string | null;
  digitalKeyPassId?: string | null;
  lockBattery?: number;
  // Backwards compatibility with board/housekeeping.html
  notes?: string;
  att?: string;
}

export type SuiteDocs = Record<string, RoomDoc>;

// Checklist template for Extended Stay America Suites
export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistItem[] = [
  // Bedroom
  { id: "bed_linens", category: "bedroom", label: "Strip & replace bedding/linens with fresh hotel sheets", mandatory: true },
  { id: "bed_pillows", category: "bedroom", label: "Inspect pillows, protectors & mattress pad", mandatory: true },
  { id: "bed_surfaces", category: "bedroom", label: "Dust & sanitize nightstands, desk, lamps & TV", mandatory: true },
  { id: "bed_vacuum", category: "bedroom", label: "Vacuum carpet including under desk and bed edges", mandatory: true },
  { id: "bed_trash", category: "bedroom", label: "Empty bedroom trash bin & replace fresh liner", mandatory: true },

  // Bathroom
  { id: "bath_toilet", category: "bathroom", label: "Scrub & disinfect toilet inside and out (bowl, rim, base)", mandatory: true },
  { id: "bath_shower", category: "bathroom", label: "Scrub tub/shower enclosure, fixtures & clean liner", mandatory: true },
  { id: "bath_sink", category: "bathroom", label: "Disinfect sink basin, faucet & vanity countertop", mandatory: true },
  { id: "bath_mirror", category: "bathroom", label: "Clean mirror streak-free", mandatory: true },
  { id: "bath_towels", category: "bathroom", label: "Restock bath towels, hand towels & washcloths to standard", mandatory: true },
  { id: "bath_amenities", category: "bathroom", label: "Restock guest soaps, shampoo, conditioner & toilet tissue", mandatory: true },
  { id: "bath_floor", category: "bathroom", label: "Mop and disinfect tile floor", mandatory: true },

  // Kitchenette / Refreshment Station
  { id: "kitchen_sink", category: "kitchenette", label: "Scrub, disinfect and dry stainless sink & faucet", mandatory: true },
  { id: "kitchen_counters", category: "kitchenette", label: "Disinfect countertops, backsplash & dining table", mandatory: true },
  { id: "kitchen_appliances", category: "kitchenette", label: "Wipe microwave (interior/exterior), stovetop & refrigerator", mandatory: true },
  { id: "kitchen_dishes", category: "kitchenette", label: "Verify kitchen dish pack inventory (plates, cookware, cutlery)", mandatory: false },
  { id: "kitchen_trash", category: "kitchenette", label: "Empty kitchen trash bin & install fresh liner", mandatory: true },

  // Final Check
  { id: "final_smell", category: "final_check", label: "Check room odor & set thermostat to 70°F (Auto)", mandatory: true },
  { id: "final_lights", category: "final_check", label: "Test all lights, switches, AC & alarm clock", mandatory: false },
  { id: "final_safety", category: "final_check", label: "Verify smoke detector intact & deadbolt operates smoothly", mandatory: true },
  { id: "final_presentation", category: "final_check", label: "Final room presentation check (blinds level, hangers spaced)", mandatory: true },
];

export const INSPECTION_CATEGORIES = [
  { id: "bedroom", label: "Bedroom & Linens" },
  { id: "bathroom", label: "Bathroom & Sanitation" },
  { id: "kitchenette", label: "Kitchenette & Appliances" },
  { id: "floors", label: "Floors, Carpets & Surfaces" },
  { id: "supplies", label: "Supplies, Amenities & Linens" },
  { id: "presentation", label: "Overall Presentation & Odor" },
  { id: "safety", label: "Safety, Locks & Fixtures" },
];

export const MAINTENANCE_CATEGORIES = [
  "Plumbing (Leak, Toilet, Drain)",
  "Electrical & Outlets",
  "HVAC & Thermostat",
  "Kitchen Appliances (Stove, Microwave, Fridge)",
  "Furniture & Fixtures",
  "Lighting & Bulbs",
  "Door Lock / Electronic Key",
  "Smoke Detector / Safety",
  "Other / Property",
];

export const SUPPLY_ITEMS = [
  "Fitted & Flat Sheets (Queen)",
  "Fitted & Flat Sheets (King)",
  "Pillowcases & Protectors",
  "Bath Towels (Heavyweight)",
  "Hand Towels & Washcloths",
  "Bath Mats",
  "Bath Amenities (Shampoo/Conditioner/Soap)",
  "Toilet Paper (Case)",
  "Trash Can Liners (Small & Large)",
  "Disinfectant Spray & Microfiber Cloths",
  "Kitchen Dish Packs & Sponges",
  "Mop Heads & Cleaning Chemical Concentrate",
];

export const STAFF_ATTENDANTS = [
  "Maria S.",
  "Carlos R.",
  "Elena D.",
  "David L.",
  "Rosa M.",
  "Javier T.",
  "Ana G.",
];

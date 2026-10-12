// Guest request links. Each suite gets a fixed link carrying a short signed key, so a
// guest can only make requests for the suite whose card or QR code they were given.
import { sign } from "@/lib/auth";

export const SUITE = /^[1-3](0[1-9]|[12]\d|3[0-2])$/; // 101–132, 201–232, 301–332

export const SUITES: string[] = [1, 2, 3].flatMap((f) =>
  Array.from({ length: 32 }, (_, i) => `${f}${String(i + 1).padStart(2, "0")}`),
);

export type GuestRequest = "cleaning" | "towels" | "amenities" | "dnd_on" | "dnd_off";

export const REQUEST_LABEL: Record<GuestRequest, string> = {
  cleaning: "Cleaning requested",
  towels: "Fresh towels requested",
  amenities: "Amenities refill requested",
  dnd_on: "Do Not Disturb on",
  dnd_off: "Do Not Disturb off",
};

export async function guestKey(suite: string): Promise<string> {
  return (await sign(`guest.${suite}`)).slice(0, 12);
}

export async function validGuest(suite: string, key: string | null | undefined): Promise<boolean> {
  return SUITE.test(suite) && typeof key === "string" && key === (await guestKey(suite));
}

// The hotel's local date (Houston), as the board's shift date uses.
export function hotelToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

export function hotelTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
}

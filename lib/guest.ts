// Guest request and keyless entry system. Each suite gets a signed key, so a
// guest can access their suite, make requests, and unlock their door with their phone.
import { sign } from "@/lib/auth";

export const SUITE = /^\d{3,4}$/; // Dynamic room numbers (e.g. 101–532)

export const SUITES: string[] = [1, 2, 3].flatMap((f) =>
  Array.from({ length: 32 }, (_, i) => `${f}${String(i + 1).padStart(2, "0")}`),
);

export type GuestRequest = "cleaning" | "towels" | "amenities" | "dnd_on" | "dnd_off" | "keyless_unlock";

export const REQUEST_LABEL: Record<GuestRequest, string> = {
  cleaning: "Cleaning requested",
  towels: "Fresh towels requested",
  amenities: "Amenities refill requested",
  dnd_on: "Do Not Disturb on",
  dnd_off: "Do Not Disturb off",
  keyless_unlock: "Digital Key Room Unlock",
};

export async function guestKey(suite: string): Promise<string> {
  return (await sign(`guest.${suite}`)).slice(0, 12);
}

export async function validGuest(suite: string, key: string | null | undefined): Promise<boolean> {
  if (!suite || typeof key !== "string") return false;
  const expected = await guestKey(suite);
  return key === expected;
}

// Generates an encrypted rolling digital credential token for the mobile key
export async function generateDigitalPassToken(suite: string): Promise<string> {
  const secret = await sign(`keyless.token.${suite}.${hotelToday()}`);
  return `BLE-${suite}-${secret.slice(0, 8).toUpperCase()}`;
}

// The hotel's local date (Houston/Central), as the shift date uses.
export function hotelToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

export function hotelTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
}

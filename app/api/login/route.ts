import { NextResponse } from "next/server";
import { checkPin, createSession, ROLES, type Role } from "@/lib/auth";
import { count, forget, hit, ttl } from "@/lib/store";
import { findByPin } from "@/lib/staff";

// Wrong-PIN limit per device address. Generous because every iPad on the hotel's Wi-Fi shares
// one public address; a correct PIN clears the count.
const MAX_FAILURES = 10;
const WINDOW_SECONDS = 15 * 60;

function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

export async function POST(req: Request) {
  const form = await req.formData();
  const role = String(form.get("role")) as Role;
  const pin = String(form.get("pin") ?? "");
  const next = new URL(req.url);
  const failKey = `hk:login:fail:${clientIp(req)}`;
  const back = (error: string, waitSeconds = 0) => {
    next.pathname = "/login";
    next.search = `?error=${error}${waitSeconds ? `&wait=${Math.ceil(waitSeconds / 60)}` : ""}`;
    return NextResponse.redirect(next, 303);
  };

  if ((await count(failKey)) >= MAX_FAILURES) return back("locked", await ttl(failKey));
  // A shared role PIN signs in as that role. Otherwise a personal PIN from the staff roster signs
  // that person in with their roster role, whatever role was picked on the form.
  const shared = role in ROLES && checkPin(role, pin);
  const person = shared ? null : await findByPin(pin);
  if (!shared && !person) {
    if ((await hit(failKey, WINDOW_SECONDS)) >= MAX_FAILURES) {
      console.warn("sign-in locked after repeated wrong PINs", failKey);
      return back("locked", await ttl(failKey));
    }
    return back("1");
  }

  await forget(failKey);
  const landing: Role = person ? person.role : role;
  await createSession(landing, person?.id);

  // Role-specific landing destinations
  if (landing === "housekeeper" || landing === "housekeeping") {
    next.pathname = "/housekeeper";
  } else {
    next.pathname = "/dashboard";
  }
  next.search = "";
  return NextResponse.redirect(next, 303);
}

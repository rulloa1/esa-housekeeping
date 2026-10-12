import { NextResponse } from "next/server";
import { createSession, pinFor, ROLES, type Role } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const role = String(form.get("role")) as Role;
  const pin = String(form.get("pin") ?? "");
  const next = new URL(req.url);

  if (!(role in ROLES) || !pinFor(role) || pin !== pinFor(role)) {
    next.pathname = "/login";
    next.search = "?error=1";
    return NextResponse.redirect(next, 303);
  }

  await createSession(role);

  // Role-specific landing destinations
  if (role === "housekeeper" || role === "housekeeping") {
    next.pathname = "/housekeeper";
  } else {
    next.pathname = "/";
  }
  next.search = "";
  return NextResponse.redirect(next, 303);
}

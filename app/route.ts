import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The site address opens the work screens: signed-in staff go straight to the dashboard
// (housekeepers to their own view); anyone else gets the sign-in page, which then opens the
// dashboard. The public landing page is at /welcome.
export async function GET(req: Request) {
  const role = await getRole();
  if (role) {
    if (role === "housekeeper" || role === "housekeeping") {
      return NextResponse.redirect(new URL("/housekeeper", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

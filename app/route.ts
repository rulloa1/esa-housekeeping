import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The site address: visitors get the hotel's public landing page (board/landing.html, from the
// marketing kit, images in public/landing/); signed-in staff go to their home at /staff.
export async function GET(req: Request) {
  if (await getRole()) return NextResponse.redirect(new URL("/staff", req.url));
  const html = await readFile(path.join(process.cwd(), "board/landing.html"), "utf8");
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

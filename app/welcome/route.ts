import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The hotel's public landing page (board/landing.html, from the marketing kit, images in
// public/landing/). It used to be the site address; that now opens the dashboard (app/route.ts).
export async function GET() {
  const html = await readFile(path.join(process.cwd(), "board/landing.html"), "utf8");
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

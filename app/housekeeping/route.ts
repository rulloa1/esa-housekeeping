import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Serves the board with /hk-db.js injected ahead of its own script. The shim gives the
// page the same db interface it uses as a Claude artifact, backed by /api/suites.
export async function GET(req: Request) {
  if (!(await getRole())) return NextResponse.redirect(new URL("/login", req.url));
  const html = await readFile(path.join(process.cwd(), "board/housekeeping.html"), "utf8");
  const out = html.replace("<head>", '<head>\n<script src="/hk-db.js"></script>');
  return new NextResponse(out, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

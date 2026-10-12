import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRole } from "@/lib/auth";
import { LANG_COOKIE } from "@/lib/lang";
import { boardNavHtml } from "@/lib/boardNav";

export const dynamic = "force-dynamic";

// Serves the board with /hk-db.js injected ahead of its own script. The shim gives the
// page the same db interface it uses as a Claude artifact, backed by /api/suites.
export async function GET(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.redirect(new URL("/login", req.url));

  const html = await readFile(path.join(process.cwd(), "board/housekeeping.html"), "utf8");

  // Language: the board keeps EN/ES in localStorage "iah-hk-lang"; sign-in and guest pages use the
  // hk_lang cookie. Seed the board from the cookie, and mirror the board's own toggle back into it.
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = saved === "es" || saved === "en" ? saved : "";
  const langSync =
    `try{var K="iah-hk-lang";${lang ? `localStorage.setItem(K,"${lang}");` : ""}` +
    `var S=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){S.apply(this,arguments);` +
    `if(k===K&&(v==="en"||v==="es"))document.cookie="${LANG_COOKIE}="+v+"; path=/; max-age=31536000; samesite=lax"}}catch(e){}`;

  // The board knows two device modes: "housekeeping" (each tap saves) and "frontdesk" (Save button).
  const boardRole = role === "housekeeper" || role === "housekeeping" ? "housekeeping" : "frontdesk";
  const inject = `<script>try{localStorage.setItem("iah-hk-role","${boardRole}")}catch{}${langSync}</script>\n<script src="/hk-db.js"></script>\n<link rel="icon" href="/icon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-icon.png">`;

  // The app's own top menu (same as components/NavigationHeader.tsx), as static HTML.
  const navBanner = boardNavHtml(role);

  let out = html.replace("<head>", `<head>\n${inject}`);
  out = out.replace("<body>", `<body>\n${navBanner}`);

  return new NextResponse(out, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRole } from "@/lib/auth";
import { LANG_COOKIE } from "@/lib/lang";

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

  const navBanner = `
<div style="position:sticky;top:0;z-index:9999;background:#2F7A1E;color:#FFFFFF;padding:8px 16px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 6px rgba(0,0,0,0.2);">
  <div style="display:flex;align-items:center;gap:10px;">
    <img src="/esa-logo.png" style="height:24px;filter:brightness(0) invert(1);" alt="ESA Logo" />
    <span style="font-weight:700;letter-spacing:0.5px;">Houston IAH · 3D Building Board</span>
  </div>
  <div style="display:flex;align-items:center;gap:16px;">
    <a href="/dashboard" style="color:#FFFFFF;text-decoration:none;font-weight:700;display:flex;align-items:center;gap:4px;">📊 Operations Dashboard</a>
    <a href="/housekeeper" style="color:#FFFFFF;text-decoration:none;font-weight:700;display:flex;align-items:center;gap:4px;">📱 Housekeeper View</a>
    <a href="/guest-links" style="color:#FFFFFF;text-decoration:none;font-weight:700;display:flex;align-items:center;gap:4px;">🖨️ Guest QR Cards</a>
    <a href="/staff" style="color:#FFFFFF;text-decoration:none;font-weight:700;display:flex;align-items:center;gap:4px;">🏠 Staff Portal</a>
    <form method="post" action="/api/logout" style="margin:0;display:inline;">
      <button type="submit" style="background:rgba(255,255,255,0.2);border:none;color:#FFFFFF;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;">Sign out</button>
    </form>
  </div>
</div>`;

  let out = html.replace("<head>", `<head>\n${inject}`);
  out = out.replace("<body>", `<body>\n${navBanner}`);

  return new NextResponse(out, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

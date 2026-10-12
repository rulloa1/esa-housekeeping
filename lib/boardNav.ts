// The app's top menu (components/NavigationHeader.tsx) as plain HTML, for the /housekeeping board.
// The board is a static page, so the React header can't render there; this copies its markup,
// sizes, colours and breakpoints so the board's menu looks and behaves the same:
//   - desktop: logo · "Houston IAH / Housekeeping" · five links (active one in ESA green) · role badge · Sign out
//   - iPad landscape (901–1279px): emoji hidden, links tightened
//   - ≤900px: links move to a scrolling pill row, and the ☰ button opens the full-width menu
// z-index stays under the board's suite sheet (scrim 10, sheet 11) so the sheet's close button
// is never covered. The board reads --app-nav-h so its sticky toolbar sits just below the menu.

type Role = string | null;

const LINKS = [
  { href: "/dashboard", label: "Supervisor Dashboard", icon: "📊" },
  { href: "/housekeeper", label: "Housekeeper View", icon: "📱" },
  { href: "/housekeeping", label: "3D Building Board", icon: "🏢" },
  { href: "/guest-links", label: "Guest QR Cards", icon: "🖨️" },
  { href: "/staff", label: "Staff Portal", icon: "🏠" },
];
const ACTIVE = "/housekeeping";

export function boardNavHtml(role: Role): string {
  const badge = role ? (role === "housekeeper" || role === "housekeeping" ? "Housekeeper" : "Supervisor") : "Staff";
  const link = (l: (typeof LINKS)[number]) =>
    `<a href="${l.href}"${l.href === ACTIVE ? ' class="on" aria-current="page"' : ""}><span class="ic">${l.icon}</span> ${l.label}</a>`;
  const pill = (l: (typeof LINKS)[number]) =>
    `<a href="${l.href}"${l.href === ACTIVE ? ' class="on" aria-current="page"' : ""}><span>${l.icon}</span> ${l.label}</a>`;
  const row = (l: (typeof LINKS)[number]) =>
    `<a href="${l.href}"${l.href === ACTIVE ? ' class="on" aria-current="page"' : ""}><span class="ic">${l.icon}</span><span>${l.label}</span>${l.href === ACTIVE ? '<span class="act">● Active</span>' : ""}</a>`;

  return `
<header id="app-nav" data-noi18n>
<style>
#app-nav{--g:#2F7A1E;--brown:#4A3728;--brown-soft:#F6EFE5;--tx:#2C2016;--tx2:#5C4B3C;--mut:#827263;--bd:#DDD5C8;--bd2:#EBE5DB;--muted-bg:#F3ECE2;
  background:#fff;border-bottom:1px solid var(--bd);position:sticky;top:0;z-index:9;box-shadow:0 1px 2px rgba(44,32,22,.05);
  font-family:'Inter',system-ui,-apple-system,sans-serif;color:var(--tx);-webkit-font-smoothing:antialiased;line-height:1.4}
#app-nav *{box-sizing:border-box}
#app-nav .bar{max-width:1320px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
#app-nav .brand{display:flex;align-items:center;gap:12px;min-width:0}
#app-nav .brand>a{display:flex;align-items:center;text-decoration:none;flex-shrink:0}
#app-nav .brand img{height:34px;object-fit:contain;display:block}
#app-nav .site{border-left:1px solid var(--bd);padding-left:10px;min-width:0}
#app-nav .site b{display:block;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--brown);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#app-nav .site span{display:block;font-size:12px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#app-nav .links{display:flex;align-items:center;gap:6px}
#app-nav .links a{padding:7px 12px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;display:flex;align-items:center;gap:6px;white-space:nowrap;color:var(--tx2);transition:all .15s ease}
#app-nav .links a.on{background:var(--g);color:#fff}
#app-nav .right{display:flex;align-items:center;gap:8px;flex-shrink:0}
#app-nav .badge{padding:4px 8px;border-radius:9999px;background:var(--brown-soft);color:var(--brown);font-size:11px;font-weight:700;display:flex;align-items:center;gap:5px}
#app-nav .badge i{width:7px;height:7px;border-radius:50%;background:var(--g);display:inline-block}
#app-nav form{margin:0}
#app-nav .out{padding:6px 10px;border-radius:6px;border:1px solid var(--bd);background:#fff;color:var(--tx2);font-family:inherit;font-size:11px;font-weight:600;line-height:1.4;cursor:pointer}
#app-nav .tog{display:none;padding:6px 10px;border-radius:6px;border:1px solid var(--bd);background:#fff;color:var(--tx);font-size:16px;line-height:1.4;cursor:pointer;align-items:center;justify-content:center;font-family:inherit}
#app-nav .tog[aria-expanded=true]{background:var(--brown-soft)}
#app-nav .pills{display:none}
#app-nav .drop{background:#fff;border-top:1px solid var(--bd);padding:12px 16px 16px;display:grid;gap:8px;box-shadow:0 4px 12px rgba(44,32,22,.08)}
#app-nav .drop[hidden]{display:none}
#app-nav .drop .h{font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}
#app-nav .drop a{padding:12px 14px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;display:flex;align-items:center;gap:12px;background:var(--muted-bg);color:var(--tx)}
#app-nav .drop a .ic{font-size:18px}
#app-nav .drop a.on{background:var(--g);color:#fff}
#app-nav .drop .act{margin-left:auto;font-size:12px}
@media (min-width:901px) and (max-width:1279px){#app-nav .links a{padding:7px 9px;font-size:12.5px}#app-nav .links .ic{display:none}}
@media (max-width:900px){
  #app-nav .links{display:none}
  #app-nav .tog{display:flex}
  #app-nav .pills{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:8px;padding:8px 16px;border-top:1px solid var(--bd2);background:#FAFAFA}
  #app-nav .pills::-webkit-scrollbar{display:none}
  #app-nav .pills a{padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;background:#fff;color:var(--tx2);border:1px solid var(--bd);box-shadow:0 1px 2px rgba(44,32,22,.05)}
  #app-nav .pills a.on{background:var(--g);color:#fff;border-color:var(--g)}
}
</style>
<div class="bar">
  <div class="brand">
    <a href="/dashboard"><img src="/esa-logo.png" alt="Extended Stay America"></a>
    <div class="site"><b>Houston IAH</b><span>Housekeeping</span></div>
  </div>
  <nav class="links" aria-label="Main Navigation">${LINKS.map(link).join("")}</nav>
  <div class="right">
    <div class="badge"><i></i>${badge}</div>
    <form method="post" action="/api/logout"><button type="submit" class="out" title="Sign out of shift">Sign out</button></form>
    <button type="button" class="tog" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>
  </div>
</div>
<nav class="pills" aria-label="Mobile Quick Navigation">${LINKS.map(pill).join("")}</nav>
<div class="drop" hidden><div class="h">Hotel Station Views</div>${LINKS.map(row).join("")}</div>
<script>(function(){var n=document.getElementById("app-nav"),t=n.querySelector(".tog"),d=n.querySelector(".drop");
t.addEventListener("click",function(){var o=d.hidden;d.hidden=!o;t.setAttribute("aria-expanded",o);t.textContent=o?"✕":"☰";if(!o)set()});
var set=function(){if(d.hidden)document.documentElement.style.setProperty("--app-nav-h",Math.ceil(n.getBoundingClientRect().height)+"px")};
var pl=n.querySelector(".pills"),pa=pl.querySelector(".on");if(pa)pl.scrollLeft=pa.offsetLeft-16;
set();if(window.ResizeObserver)new ResizeObserver(set).observe(n);addEventListener("resize",set)})();</script>
</header>`;
}

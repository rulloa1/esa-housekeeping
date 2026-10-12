"use client";

import type { CSSProperties } from "react";

// Two-option EN / ES switch. Saves the choice for a year and reloads the page in that language.
export default function LangToggle({ lang, style }: { lang: "en" | "es"; style?: CSSProperties }) {
  const pick = (l: "en" | "es") => {
    if (l === lang) return;
    document.cookie = `hk_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    // Same choice for the board, which reads it from this key.
    try { localStorage.setItem("iah-hk-lang", l); } catch {}
    location.reload();
  };
  const btn = (l: "en" | "es", label: string) => (
    <button
      type="button"
      onClick={() => pick(l)}
      aria-pressed={lang === l}
      lang={l}
      style={{
        border: 0,
        borderRadius: 3,
        padding: "6px 12px",
        font: "inherit",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        background: lang === l ? "#338802" : "transparent",
        color: lang === l ? "#fff" : "#483729",
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label={lang === "es" ? "Idioma" : "Language"}
      style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 4, background: "#fff", border: "1px solid #DBDEDB", ...style }}
    >
      {btn("en", "EN")}
      {btn("es", "ES")}
    </div>
  );
}

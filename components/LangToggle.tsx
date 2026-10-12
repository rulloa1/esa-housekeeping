"use client";

import type { CSSProperties } from "react";

// Two-option EN / ES switch. Saves the choice for a year and reloads the page in that language.
export default function LangToggle({ lang, style }: { lang: "en" | "es"; style?: CSSProperties }) {
  const pick = (l: "en" | "es") => {
    if (l === lang) return;
    document.cookie = `hk_lang=${l}; path=/; max-age=31536000; samesite=lax`;
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
        borderRadius: 999,
        padding: "6px 12px",
        font: "inherit",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        background: lang === l ? "#0f172a" : "transparent",
        color: lang === l ? "#fff" : "#334155",
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label={lang === "es" ? "Idioma" : "Language"}
      style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 999, background: "rgba(255,255,255,.9)", boxShadow: "0 1px 3px rgba(15,23,42,.15)", ...style }}
    >
      {btn("en", "EN")}
      {btn("es", "ES")}
    </div>
  );
}

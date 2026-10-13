"use client";

import { useRef, useState } from "react";

// Shrinks a photo on the phone before it's sent: longest side 1280 px, JPEG. A 4 MB camera photo
// becomes roughly 100 KB, which uploads quickly on corridor Wi-Fi.
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("not an image"));
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    let out = canvas.toDataURL("image/jpeg", 0.72);
    if (out.length > 500_000) out = canvas.toDataURL("image/jpeg", 0.5);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const MESSAGES: Record<string, string> = {
  tooMany: "Too many photos right now. Try again later.",
  tooBig: "That photo is too large.",
  badImage: "That file isn't a photo.",
};

// "Add photo" button: opens the camera on phones and iPads, uploads, and shows a thumbnail.
// Calls onChange with the photo's address (or null when removed).
export function PhotoPicker({ value, onChange, userName, label = "📷 Add photo" }: {
  value: string | null;
  onChange: (url: string | null) => void;
  userName?: string;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const image = await shrink(file);
      const res = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, userName }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(MESSAGES[data.reason] || "Couldn't upload the photo. Try again.");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error && err.message !== "not an image" ? err.message : MESSAGES.badImage);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const btn: React.CSSProperties = {
    minHeight: 44, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border-default, #DBDEDB)",
    background: "#fff", color: "var(--esa-brown, #483729)", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: busy ? "wait" : "pointer",
  };

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Attached photo" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border-default, #DBDEDB)" }} />
          <button type="button" style={btn} onClick={() => onChange(null)} disabled={busy}>Remove photo</button>
        </div>
      ) : (
        <button type="button" style={btn} onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : label}
        </button>
      )}
      {error && <div role="alert" style={{ fontSize: 12, color: "#B91C1C", fontWeight: 600 }}>{error}</div>}
    </div>
  );
}

// A tappable thumbnail that opens the full photo in a new tab.
export function PhotoThumb({ url, size = 64, label = "Photo" }: { url?: string | null; size?: number; label?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener" aria-label={`${label} (opens full size)`} style={{ display: "inline-block", lineHeight: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} loading="lazy" style={{ width: size, height: size, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border-default, #DBDEDB)" }} />
    </a>
  );
}

"use client";

import { useState, useEffect } from "react";
import { BRAND } from "@/lib/brand";

export default function BrandLogo({ height = 40 }: { height?: number }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [BRAND.logo]);

  if (failed || !BRAND.logo) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          background: BRAND.green,
          color: "#FFFFFF",
          fontWeight: 800,
          fontSize: Math.max(12, Math.round(height * 0.34)),
          letterSpacing: 0.5,
          borderRadius: BRAND.radius,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: BRAND.accent,
            display: "inline-block",
          }}
        />
        {BRAND.name}
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={BRAND.logo}
      alt={`${BRAND.name} Logo`}
      height={height}
      style={{ height, width: "auto", display: "block", objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}

export { BrandLogo };

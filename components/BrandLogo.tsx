"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

// The ESA logo from the brand kit. If it can't load, a text wordmark takes its place.
export default function BrandLogo({ height = 40 }: { height?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span style={{ display: "inline-block", padding: "6px 10px", background: BRAND.green, color: "#fff", fontWeight: 700, fontSize: height * 0.32, letterSpacing: 0.5, borderRadius: BRAND.radius }}>
        Extended Stay America
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={BRAND.logo} alt="Extended Stay America Logo" height={height} style={{ height, width: "auto", display: "block" }} onError={() => setFailed(true)} />;
}

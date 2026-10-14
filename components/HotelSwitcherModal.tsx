"use client";

import { useEffect, useRef, useState } from "react";
import { HOTEL_PRESETS, type HotelPreset } from "@/hotel.config";
import { BRAND } from "@/lib/brand";

interface HotelSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HotelSwitcherModal({ isOpen, onClose }: HotelSwitcherModalProps) {
  const [selectedId, setSelectedId] = useState<string>("esa");
  const [switching, setSwitching] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read current cookie if exists
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|; )hotel_preset=([^;]*)/);
      if (match && match[1]) {
        setSelectedId(match[1]);
      }
    }
  }, [isOpen]);

  // Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApply = async (presetId: string) => {
    setSwitching(true);
    try {
      await fetch("/api/hotel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId }),
      });
      // Set document cookie directly for instant client-side read & reload
      document.cookie = `hotel_preset=${presetId}; path=/; max-age=31536000; SameSite=Lax`;
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  };

  const presetList = Object.values(HOTEL_PRESETS);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotel-switcher-title"
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "92vh",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid var(--border-default, #E2E8F0)",
          borderTop: "4px solid var(--color-accent, #A16207)",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-subtle, #F1F5F9)",
            background: "linear-gradient(to bottom, #FFFFFF, var(--bg-muted, #F8FAFC))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--color-primary, #1E3A8A)",
                letterSpacing: "1.2px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-accent, #A16207)",
                }}
              />
              White-Label Property Template Switcher
            </div>
            <h2
              id="hotel-switcher-title"
              style={{
                margin: "4px 0 2px",
                fontSize: "1.35rem",
                fontWeight: 700,
                fontFamily: "'Playfair Display SC', Georgia, serif",
                color: "var(--text-main, #0F172A)",
              }}
            >
              Switch Hotel Brand & Configuration
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted, #64748B)" }}>
              Current Active Property: <strong style={{ color: "var(--text-secondary, #334155)" }}>{BRAND.name} ({BRAND.location})</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close hotel switcher dialog"
            className="modal-close-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Instructions banner */}
        <div style={{ padding: "12px 24px", background: "var(--st-assigned-bg, #EFF6FF)", borderBottom: "1px solid var(--st-assigned-border, #BFDBFE)", fontSize: 13, color: "var(--color-primary, #1E3A8A)" }}>
          💡 <strong>Template feature:</strong> Select any hotel brand below to preview its bespoke color scheme, suite counts, and amenity features in real-time. You can also permanently configure your property in <code>hotel.config.ts</code>.
        </div>

        {/* Presets List */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "grid", gap: 12, background: "var(--bg-muted, #F8FAFC)" }}>
          {presetList.map((preset: HotelPreset) => {
            const isSelected = selectedId === preset.id;
            return (
              <div
                key={preset.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(preset.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(preset.id);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "16px 20px",
                  borderRadius: 12,
                  border: "2px solid",
                  borderColor: isSelected ? preset.theme.primary : "var(--border-default, #E2E8F0)",
                  background: isSelected ? "#FFFFFF" : "#FFFFFF",
                  boxShadow: isSelected ? `0 4px 14px ${preset.theme.primary}25` : "0 1px 3px rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  outline: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
                  {/* Hotel Photo Thumbnail & Brand Swatch */}
                  <div
                    style={{
                      width: 68,
                      height: 52,
                      borderRadius: 10,
                      overflow: "hidden",
                      backgroundImage: `url(${preset.photos.hero})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: "1px solid rgba(0,0,0,0.1)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        bottom: 3,
                        right: 3,
                        padding: "1px 5px",
                        borderRadius: 4,
                        backgroundColor: preset.theme.primary,
                        color: "#FFFFFF",
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: 0.5,
                      }}
                    >
                      {preset.shortName.slice(0, 3).toUpperCase()}
                    </span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-main, #0F172A)" }}>
                        {preset.name}
                      </h3>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 6,
                            backgroundColor: preset.theme.primary,
                            color: "#FFFFFF",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted, #64748B)", marginTop: 2 }}>
                      📍 {preset.location} · {preset.address}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-primary, #1E3A8A)", fontWeight: 600, marginTop: 2 }}>
                      🏢 {preset.propertyLayout.floors} Floors · {preset.propertyLayout.floors * preset.propertyLayout.roomsPerFloor} Total Rooms · 📞 {preset.phone}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary, #475569)", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>☕ {preset.details.breakfast.name}</span>
                      <span>📶 {preset.details.wifiSsid}</span>
                      {preset.features.hasKitchenettes && <span>🍳 Kitchenettes</span>}
                      {preset.features.hasBalconies && <span>🌅 Balconies</span>}
                      {preset.features.hasTurndownService && <span>✨ Turndown</span>}
                    </div>
                  </div>
                </div>

                {/* Radio selection check */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "2px solid",
                    borderColor: isSelected ? preset.theme.primary : "var(--border-default, #CBD5E1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: preset.theme.primary,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-default, #E2E8F0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FFFFFF",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={switching}
            style={{
              padding: "11px 18px",
              minHeight: 44,
              borderRadius: 8,
              border: "1px solid var(--border-default, #E2E8F0)",
              background: "#FFFFFF",
              color: "var(--text-secondary, #475569)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleApply(selectedId)}
            disabled={switching}
            style={{
              padding: "11px 24px",
              minHeight: 44,
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, var(--color-primary, #1E3A8A), #1D4ED8)",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              cursor: switching ? "not-allowed" : "pointer",
              boxShadow: "0 2px 6px rgba(30, 58, 138, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            {switching ? (
              <>
                <svg
                  style={{ animation: "spin 1s linear infinite" }}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Switching Property...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Activate Property ({HOTEL_PRESETS[selectedId]?.name || "Selected"})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

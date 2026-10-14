"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomDoc } from "@/lib/models";
import { INSPECTION_CATEGORIES } from "@/lib/models";
import { PhotoPicker } from "./PhotoPicker";

interface InspectionModalProps {
  room: RoomDoc;
  onClose: () => void;
  onComplete: (updated: RoomDoc) => void;
}

const COMMON_FAIL_REASONS = [
  "Dust on furniture or nightstand",
  "Carpet requires re-vacuuming",
  "Bathroom mirror or chrome streaked",
  "Toilet bowl or base not clean",
  "Microwave / Stovetop grease residue",
  "Missing ESA bath towels or amenities",
  "Odor / Thermostat not set to 70°F",
  "Linen wrinkled or improperly tucked",
];

export function InspectionModal({ room, onClose, onComplete }: InspectionModalProps) {
  const [categories, setCategories] = useState<Record<string, "pass" | "fail" | "na">>(() => {
    const initial: Record<string, "pass" | "fail" | "na"> = {};
    INSPECTION_CATEGORIES.forEach((c) => {
      initial[c.id] = room.inspectionCategories?.[c.id] || "pass";
    });
    return initial;
  });

  const [selectedReasons, setSelectedReasons] = useState<string[]>(room.inspectionFailReasons || []);
  const [customReason, setCustomReason] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState(room.inspectionNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation & accessibility: Escape to dismiss + Focus trap within modal
  useEffect(() => {
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
  }, [onClose]);

  // Auto-focus first interactive element on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const firstBtn = dialogRef.current.querySelector<HTMLElement>("button.modal-close-btn, button");
        firstBtn?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleCategoryChange = (catId: string, val: "pass" | "fail" | "na") => {
    setCategories((prev) => ({ ...prev, [catId]: val }));
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const hasAnyFail = Object.values(categories).some((val) => val === "fail") || selectedReasons.length > 0;

  const handlePass = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inspect_pass",
          inspectionCategories: categories,
          inspectionNotes: notes || "Room passed full ESA inspection standards.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve inspection");
      onComplete(data.room);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving inspection");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFail = async () => {
    const reasons = [...selectedReasons];
    if (customReason.trim()) reasons.push(customReason.trim());

    if (reasons.length === 0) {
      setErrorMsg("Please select or specify at least one reason for failing this inspection.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inspect_fail",
          inspectionCategories: categories,
          failReasons: reasons,
          photoUrl: photoUrl || undefined,
          inspectionNotes: notes || reasons.join("; "),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject room");
      onComplete(data.room);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error rejecting inspection");
    } finally {
      setSubmitting(false);
    }
  };

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
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspection-modal-title"
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "92vh",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid var(--border-default, #E2E8F0)",
          borderTop: "4px solid var(--color-primary, #1E3A8A)",
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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to bottom, #FFFFFF, var(--bg-muted, #F8FAFC))",
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
              Supervisor Quality Assurance Audit
            </div>
            <h2
              id="inspection-modal-title"
              style={{
                margin: "4px 0 2px",
                fontSize: "1.35rem",
                fontWeight: 700,
                fontFamily: "'Playfair Display SC', Georgia, serif",
                color: "var(--text-main, #0F172A)",
              }}
            >
              Suite {room.id} — {room.type}
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted, #64748B)", marginTop: 2 }}>
              Attendant: <strong style={{ color: "var(--text-secondary, #334155)" }}>{room.attendant || "Unassigned"}</strong> · Floor {room.floor} · {room.serviceType === "turnover" ? "Checkout Turnover" : "Weekly Stayover"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspection dialog"
            className="modal-close-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "grid", gap: 18, background: "var(--bg-muted, #F8FAFC)" }}>
          {errorMsg && (
            <div
              role="alert"
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#DC2626",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Categories */}
          <div style={{ backgroundColor: "#FFFFFF", padding: "16px 18px", borderRadius: 12, border: "1px solid var(--border-default, #E2E8F0)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary, #334155)" }}>
              Inspection Standards Checklist
            </h3>
            <div style={{ display: "grid", gap: 8 }}>
              {INSPECTION_CATEGORIES.map((cat) => {
                const current = categories[cat.id];
                return (
                  <div
                    key={cat.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid",
                      borderColor: current === "fail" ? "var(--st-insp-fail-border, #FECDD3)" : current === "pass" ? "var(--st-clean-border, #A7F3D0)" : "var(--border-default, #E2E8F0)",
                      background: current === "fail" ? "var(--st-insp-fail-bg, #FFF1F2)" : current === "pass" ? "var(--st-clean-bg, #ECFDF5)" : "#FFFFFF",
                      transition: "all 0.15s ease",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main, #0F172A)" }}>
                      {cat.label}
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["pass", "fail", "na"] as const).map((opt) => {
                        const isSelected = current === opt;
                        const bgColor =
                          opt === "pass"
                            ? isSelected ? "var(--st-clean, #059669)" : "#FFFFFF"
                            : opt === "fail"
                            ? isSelected ? "var(--st-insp-fail, #E11D48)" : "#FFFFFF"
                            : isSelected ? "var(--st-ooo, #475569)" : "#FFFFFF";

                        const textColor = isSelected ? "#FFFFFF" : "var(--text-secondary, #475569)";
                        const borderColor = isSelected ? "transparent" : "var(--border-default, #E2E8F0)";

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleCategoryChange(cat.id, opt)}
                            style={{
                              padding: "6px 14px",
                              minHeight: 36,
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              border: `1px solid ${borderColor}`,
                              background: bgColor,
                              color: textColor,
                              cursor: "pointer",
                              boxShadow: isSelected ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {opt.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Common Fail Reasons */}
          <div style={{ backgroundColor: "#FFFFFF", padding: "16px 18px", borderRadius: 12, border: "1px solid var(--border-default, #E2E8F0)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#E11D48" }}>
              Correction Flags & Punchlist (Required if failing)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
              {COMMON_FAIL_REASONS.map((reason) => {
                const checked = selectedReasons.includes(reason);
                return (
                  <label
                    key={reason}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      minHeight: 40,
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: checked ? "#FECDD3" : "transparent",
                      background: checked ? "#FFF1F2" : "var(--bg-muted, #F8FAFC)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReason(reason)}
                      style={{ width: 18, height: 18, accentColor: "#E11D48", cursor: "pointer" }}
                    />
                    <span style={{ color: checked ? "#BE123C" : "var(--text-secondary, #334155)", fontWeight: checked ? 600 : 500 }}>
                      {reason}
                    </span>
                  </label>
                );
              })}
            </div>

            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="Other specific punchlist deficiency..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default, #E2E8F0)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
              Deficiency Photo Documentation (optional)
              <PhotoPicker value={photoUrl} onChange={setPhotoUrl} />
            </div>
          </div>

          {/* Notes */}
          <div style={{ backgroundColor: "#FFFFFF", padding: "16px 18px", borderRadius: 12, border: "1px solid var(--border-default, #E2E8F0)" }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
              Supervisor Directives & Notes
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special instructions for re-clean or verification notes..."
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default, #E2E8F0)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
            </label>
          </div>
        </div>

        {/* Footer Actions */}
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
            disabled={submitting}
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

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleFail}
              disabled={submitting}
              style={{
                padding: "11px 20px",
                minHeight: 44,
                borderRadius: 8,
                border: "none",
                background: "var(--st-insp-fail, #E11D48)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(225, 29, 72, 0.25)",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Fail & Send for Re-clean</span>
            </button>

            <button
              type="button"
              onClick={handlePass}
              disabled={submitting || hasAnyFail}
              style={{
                padding: "11px 22px",
                minHeight: 44,
                borderRadius: 8,
                border: "none",
                background: hasAnyFail ? "var(--bg-muted, #E2E8F0)" : "linear-gradient(135deg, #059669, #10B981)",
                color: hasAnyFail ? "var(--text-muted, #94A3B8)" : "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: hasAnyFail || submitting ? "not-allowed" : "pointer",
                boxShadow: hasAnyFail ? "none" : "0 4px 12px rgba(5, 150, 105, 0.25)",
                transition: "all 0.2s ease",
              }}
              title={hasAnyFail ? "Cannot pass inspection while deficiencies or fails exist" : "Approve and mark clean"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Pass & Release Room</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

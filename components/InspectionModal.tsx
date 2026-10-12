"use client";

import { useState } from "react";
import type { RoomDoc } from "@/lib/models";
import { INSPECTION_CATEGORIES } from "@/lib/models";

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
  const [notes, setNotes] = useState(room.inspectionNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
        backgroundColor: "rgba(30, 20, 10, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--esa-brown-soft)",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--esa-brown)", letterSpacing: 0.8 }}>
              Supervisor QA Inspection
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>
              Suite {room.id} — {room.type}
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Attendant: {room.attendant || "Unassigned"} · Floor {room.floor} · {room.serviceType === "turnover" ? "Checkout Turnover" : "Weekly Stayover"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1, display: "grid", gap: 16 }}>
          {errorMsg && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEE2E2", color: "#DC2626", fontSize: 13, fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {/* Categories */}
          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--esa-brown)" }}>
              Inspection Categories
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
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border-subtle)",
                      background: current === "fail" ? "#FFF1F2" : current === "pass" ? "#F0FDF4" : "#F9FAFB",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>
                      {cat.label}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(["pass", "fail", "na"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleCategoryChange(cat.id, opt)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            border: "1px solid",
                            borderColor: current === opt ? "transparent" : "var(--border-default)",
                            background:
                              current === opt
                                ? opt === "pass"
                                  ? "var(--st-clean)"
                                  : opt === "fail"
                                  ? "var(--st-insp-fail)"
                                  : "var(--st-ooo)"
                                : "#FFFFFF",
                            color: current === opt ? "#FFFFFF" : "var(--text-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          {opt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Common Fail Reasons */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--esa-brown)" }}>
              Correction Flags & Deficiencies (Required if failing)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {COMMON_FAIL_REASONS.map((reason) => {
                const checked = selectedReasons.includes(reason);
                return (
                  <label
                    key={reason}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      background: checked ? "#FFF1F2" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReason(reason)}
                      style={{ accentColor: "var(--st-insp-fail)" }}
                    />
                    <span style={{ color: checked ? "var(--st-insp-fail)" : "var(--text-secondary)", fontWeight: checked ? 600 : 400 }}>
                      {reason}
                    </span>
                  </label>
                );
              })}
            </div>

            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="Other specific deficiency (optional)..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
              Supervisor Notes & Instructions
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add comments, instructions for re-clean, or verification notes..."
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border-default)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FBF9F5",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid var(--border-default)",
              background: "#FFFFFF",
              color: "var(--text-secondary)",
              fontWeight: 600,
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
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--st-insp-fail)",
                color: "#FFFFFF",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <span>✕</span> Fail & Send for Re-clean
            </button>

            <button
              type="button"
              onClick={handlePass}
              disabled={submitting || hasAnyFail}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: hasAnyFail ? "var(--text-muted)" : "var(--st-clean)",
                color: "#FFFFFF",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: hasAnyFail ? "not-allowed" : "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
              title={hasAnyFail ? "Cannot pass inspection while deficiencies or fails exist" : "Approve and mark clean"}
            >
              <span>✓</span> Pass & Release Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

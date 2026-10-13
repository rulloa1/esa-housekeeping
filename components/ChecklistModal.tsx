"use client";

import { useRef, useState } from "react";
import { reliableFetch } from "@/lib/reliableFetch";
import type { RoomDoc } from "@/lib/models";
import { DEFAULT_CHECKLIST_TEMPLATE } from "@/lib/models";

interface ChecklistModalProps {
  room: RoomDoc;
  attendantName: string;
  onClose: () => void;
  onComplete: (updated: RoomDoc) => void;
}

export function ChecklistModal({ room, attendantName, onClose, onComplete }: ChecklistModalProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    DEFAULT_CHECKLIST_TEMPLATE.forEach((item) => {
      state[item.id] = room.checklist?.[item.id] || false;
    });
    return state;
  });

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [errorMsg, setErrorMsg] = useState("");

  const categories = [
    { id: "all", label: "All Items" },
    { id: "bedroom", label: "🛏️ Bedroom" },
    { id: "bathroom", label: "🚿 Bathroom" },
    { id: "kitchenette", label: "🍳 Kitchenette" },
    { id: "final_check", label: "✨ Final Check" },
  ];

  const totalItems = DEFAULT_CHECKLIST_TEMPLATE.length;
  const completedItems = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  const mandatoryItems = DEFAULT_CHECKLIST_TEMPLATE.filter((i) => i.mandatory);
  const completedMandatory = mandatoryItems.filter((i) => checklist[i.id]).length;
  const allMandatoryCompleted = completedMandatory === mandatoryItems.length;

  // Checklist saves go one at a time, always sending the newest state, so a save retried after
  // a Wi-Fi drop can never land after (and undo) a newer tap.
  const latest = useRef<Record<string, boolean> | null>(null);
  const saving = useRef(false);
  const saveChecklist = async (next: Record<string, boolean>) => {
    latest.current = next;
    setSaveStatus("saving");
    if (saving.current) return;
    saving.current = true;
    try {
      while (latest.current) {
        const body = latest.current;
        latest.current = null;
        try {
          const res = await reliableFetch(`/api/suites/${room.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checklist: body, userName: attendantName }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          if (!latest.current) {
            setSaveStatus("saved");
            onComplete(data.room);
          }
        } catch {
          setSaveStatus("error");
        }
      }
    } finally {
      saving.current = false;
    }
  };

  const handleToggle = (itemId: string) => {
    const nextChecklist = { ...checklist, [itemId]: !checklist[itemId] };
    setChecklist(nextChecklist);
    saveChecklist(nextChecklist);
  };

  const handleCheckAllCurrent = () => {
    const allChecked = filteredItems.every((i) => checklist[i.id]);
    const nextChecklist = { ...checklist };
    filteredItems.forEach((i) => {
      nextChecklist[i.id] = !allChecked;
    });
    setChecklist(nextChecklist);
    saveChecklist(nextChecklist);
  };

  const handleCompleteCleaning = async () => {
    if (!allMandatoryCompleted) {
      setErrorMsg(`Please complete all mandatory items (${completedMandatory}/${mandatoryItems.length} checked).`);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await reliableFetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_cleaning",
          checklist,
          userName: attendantName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit cleaning");
      onComplete(data.room);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error submitting room");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = activeCategory === "all"
    ? DEFAULT_CHECKLIST_TEMPLATE
    : DEFAULT_CHECKLIST_TEMPLATE.filter((i) => i.category === activeCategory);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(30, 20, 10, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 12,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "92vh",
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
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
            background: "var(--esa-brown-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--esa-brown)", letterSpacing: 0.8 }}>
              Cleaning Checklist & QA Tasks
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>
              Suite {room.id} · {room.type}
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Attendant: {attendantName || "Housekeeper"} · Status: {saveStatus === "saving" ? "Autosaving..." : saveStatus === "error" ? "Not saved. Tap an item again to retry" : "All progress saved"}
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

        {/* Progress Bar Header */}
        <div style={{ padding: "12px 20px", background: "#FFFFFF", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--esa-brown)" }}>
              Overall Progress: {completedItems} of {totalItems} items ({progressPercent}%)
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: allMandatoryCompleted ? "var(--st-clean)" : "var(--st-in-prog)" }}>
              {allMandatoryCompleted ? "✓ Mandatory Tasks Complete" : `⚠️ ${mandatoryItems.length - completedMandatory} Mandatory Tasks Remaining`}
            </span>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 4, background: "var(--bg-muted)", overflow: "hidden" }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: allMandatoryCompleted ? "var(--st-clean)" : "var(--esa-green)",
                transition: "width 0.25s ease",
              }}
            />
          </div>

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  border: "1px solid",
                  borderColor: activeCategory === c.id ? "var(--esa-green)" : "var(--border-default)",
                  background: activeCategory === c.id ? "var(--esa-green-soft)" : "#FFFFFF",
                  color: activeCategory === c.id ? "var(--esa-green-dark)" : "var(--text-secondary)",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Quick Category Action Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border-subtle)" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {filteredItems.filter((i) => checklist[i.id]).length} of {filteredItems.length} items checked
            </span>
            <button
              type="button"
              onClick={handleCheckAllCurrent}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "var(--radius-pill)",
                backgroundColor: "var(--bg-muted)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
                cursor: "pointer",
              }}
            >
              {filteredItems.every((i) => checklist[i.id]) ? "Uncheck All in Category" : "✓ Check All in Category"}
            </button>
          </div>
        </div>

        {/* Checklist Items */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "grid", gap: 8 }}>
          {errorMsg && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEE2E2", color: "#DC2626", fontSize: 13, fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {filteredItems.map((item) => {
            const isChecked = Boolean(checklist[item.id]);
            return (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid",
                  borderColor: isChecked ? "var(--st-clean-border)" : "var(--border-subtle)",
                  background: isChecked ? "var(--st-clean-bg)" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  readOnly
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: 2,
                    accentColor: "var(--st-clean)",
                    cursor: "pointer",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isChecked ? "var(--text-main)" : "var(--text-main)",
                        textDecoration: isChecked ? "line-through" : "none",
                        opacity: isChecked ? 0.8 : 1,
                      }}
                    >
                      {item.label}
                    </span>
                    {item.mandatory ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: isChecked ? "var(--st-clean)" : "#FEE2E2",
                          color: isChecked ? "#FFFFFF" : "#DC2626",
                          textTransform: "uppercase",
                        }}
                      >
                        {isChecked ? "Done" : "Required"}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: "var(--text-muted)", padding: "2px 6px" }}>
                        Optional
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid var(--border-default)",
              background: "#FFFFFF",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleCompleteCleaning}
            disabled={submitting || !allMandatoryCompleted}
            style={{
              padding: "11px 22px",
              borderRadius: 8,
              border: "none",
              background: allMandatoryCompleted ? "var(--esa-green)" : "var(--text-muted)",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              cursor: allMandatoryCompleted ? "pointer" : "not-allowed",
              boxShadow: allMandatoryCompleted ? "var(--shadow-sm)" : "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>✓</span> Complete Cleaning & Submit for Inspection
          </button>
        </div>
      </div>
    </div>
  );
}

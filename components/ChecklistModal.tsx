"use client";

import { useEffect, useRef, useState } from "react";
import { reliableFetch } from "@/lib/reliableFetch";
import type { RoomDoc } from "@/lib/models";
import { DEFAULT_CHECKLIST_TEMPLATE } from "@/lib/models";
import { BRAND } from "@/lib/brand";

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

  // Initial focus management
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const firstInteractive = dialogRef.current.querySelector<HTMLElement>("button.modal-close-btn, button");
        firstInteractive?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const categories = [
    {
      id: "all",
      label: "All Items",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      id: "bedroom",
      label: "Bedroom",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
        </svg>
      ),
    },
    {
      id: "bathroom",
      label: "Bathroom",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1 0L3 6" /><path d="M4 14h16a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-2a2 2 0 0 1 2-2Z" /><line x1="7" y1="14" x2="7" y2="7" /><line x1="17" y1="14" x2="17" y2="10" />
        </svg>
      ),
    },
    {
      id: "kitchenette",
      label: "Kitchenette",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 2v20" /><path d="M4 2v6a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V2" /><line x1="9" y1="12" x2="9" y2="22" />
        </svg>
      ),
    },
    {
      id: "final_check",
      label: "Final Check",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6l-6.3 4.4 2.3-7.2-6-4.4h7.6z" />
        </svg>
      ),
    },
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
      setErrorMsg(`Please complete all mandatory tasks (${completedMandatory}/${mandatoryItems.length} checked).`);
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
        aria-labelledby="checklist-dialog-title"
        style={{
          width: "100%",
          maxWidth: 680,
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
              {BRAND.name} · {BRAND.location}
            </div>
            <h2
              id="checklist-dialog-title"
              style={{
                margin: "4px 0 2px",
                fontSize: "1.35rem",
                fontWeight: 700,
                fontFamily: "'Playfair Display SC', Georgia, serif",
                color: "var(--text-main, #0F172A)",
                letterSpacing: "-0.01em",
              }}
            >
              Suite {room.id} · {room.type}
            </h2>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted, #64748B)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 2,
              }}
            >
              <span>
                Attendant: <strong style={{ color: "var(--text-secondary, #334155)" }}>{attendantName || "Housekeeper"}</strong>
              </span>
              <span aria-hidden="true" style={{ opacity: 0.4 }}>•</span>
              <span
                aria-live="polite"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                  color:
                    saveStatus === "saving"
                      ? "var(--st-in-prog, #D97706)"
                      : saveStatus === "error"
                      ? "var(--st-dirty, #DC2626)"
                      : "var(--st-clean, #059669)",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: "currentColor",
                    boxShadow: saveStatus === "saving" ? "0 0 0 3px rgba(217, 119, 6, 0.2)" : "none",
                  }}
                />
                {saveStatus === "saving"
                  ? "Autosaving progress..."
                  : saveStatus === "error"
                  ? "Save failed — tap again to retry"
                  : "All changes saved"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close checklist dialog"
            className="modal-close-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Progress & Category Section */}
        <div
          style={{
            padding: "16px 24px",
            background: "#FFFFFF",
            borderBottom: "1px solid var(--border-subtle, #F1F5F9)",
          }}
        >
          {/* Progress Metrics Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #0F172A)" }}>
              Overall Progress: <span style={{ color: "var(--color-primary, #1E3A8A)" }}>{completedItems} of {totalItems}</span> items ({progressPercent}%)
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: allMandatoryCompleted ? "var(--st-clean, #059669)" : "var(--st-in-prog, #D97706)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 8px",
                borderRadius: 6,
                backgroundColor: allMandatoryCompleted ? "var(--st-clean-bg, #ECFDF5)" : "var(--st-in-prog-bg, #FFFBEB)",
                border: `1px solid ${allMandatoryCompleted ? "var(--st-clean-border, #A7F3D0)" : "var(--st-in-prog-border, #FDE68A)"}`,
              }}
            >
              {allMandatoryCompleted ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>All Mandatory Tasks Done</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{mandatoryItems.length - completedMandatory} Mandatory Tasks Remaining</span>
                </>
              )}
            </span>
          </div>

          {/* Progress Bar Track */}
          <div
            style={{
              width: "100%",
              height: 10,
              borderRadius: 5,
              background: "var(--bg-muted, #F1F5F9)",
              overflow: "hidden",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: allMandatoryCompleted
                  ? "linear-gradient(90deg, #059669, #10B981)"
                  : "linear-gradient(90deg, var(--color-primary, #1E3A8A), var(--color-secondary, #3B82F6))",
                transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>

          {/* Category Filter Chips */}
          <div
            role="tablist"
            aria-label="Checklist Categories"
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
              overflowX: "auto",
              paddingBottom: 4,
              scrollbarWidth: "none",
            }}
          >
            {categories.map((c) => {
              const isActive = activeCategory === c.id;
              const catItems = c.id === "all" ? DEFAULT_CHECKLIST_TEMPLATE : DEFAULT_CHECKLIST_TEMPLATE.filter((i) => i.category === c.id);
              const catCompleted = catItems.filter((i) => checklist[i.id]).length;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  style={{
                    padding: "8px 14px",
                    minHeight: 40,
                    borderRadius: "999px",
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    border: "1px solid",
                    borderColor: isActive ? "var(--color-primary, #1E3A8A)" : "var(--border-default, #E2E8F0)",
                    background: isActive ? "var(--color-primary, #1E3A8A)" : "#FFFFFF",
                    color: isActive ? "#FFFFFF" : "var(--text-secondary, #475569)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    cursor: "pointer",
                    boxShadow: isActive ? "0 2px 4px rgba(30, 58, 138, 0.2)" : "0 1px 2px rgba(0,0,0,0.03)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center" }}>{c.icon}</span>
                  <span>{c.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 10,
                      backgroundColor: isActive ? "rgba(255,255,255,0.22)" : "var(--bg-muted, #F1F5F9)",
                      color: isActive ? "#FFFFFF" : "var(--text-muted, #64748B)",
                    }}
                  >
                    {catCompleted}/{catItems.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Category Action Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px dashed var(--border-subtle, #F1F5F9)",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted, #64748B)" }}>
              Viewing {filteredItems.filter((i) => checklist[i.id]).length} of {filteredItems.length} category items checked
            </span>
            <button
              type="button"
              onClick={handleCheckAllCurrent}
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                minHeight: 36,
                borderRadius: "999px",
                backgroundColor: "var(--bg-muted, #F8FAFC)",
                color: "var(--color-primary, #1E3A8A)",
                border: "1px solid var(--border-default, #E2E8F0)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{filteredItems.every((i) => checklist[i.id]) ? "Uncheck All in Category" : "Check All in Category"}</span>
            </button>
          </div>
        </div>

        {/* Checklist Scrollable Items */}
        <div
          style={{
            padding: "16px 24px",
            overflowY: "auto",
            flex: 1,
            display: "grid",
            gap: 10,
            background: "var(--bg-muted, #F8FAFC)",
          }}
        >
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

          {filteredItems.map((item) => {
            const isChecked = Boolean(checklist[item.id]);
            return (
              <div
                key={item.id}
                role="checkbox"
                tabIndex={0}
                aria-checked={isChecked}
                aria-label={`${item.label} (${item.mandatory ? "Mandatory" : "Optional"})`}
                onClick={() => handleToggle(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggle(item.id);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  minHeight: 52,
                  borderRadius: 12,
                  border: "1px solid",
                  borderColor: isChecked ? "var(--st-clean-border, #A7F3D0)" : "var(--border-default, #E2E8F0)",
                  background: isChecked ? "var(--st-clean-bg, #ECFDF5)" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isChecked ? "0 1px 3px rgba(5, 150, 105, 0.08)" : "0 1px 2px rgba(0,0,0,0.03)",
                  outline: "none",
                }}
              >
                {/* Custom Luxury Checkbox Indicator */}
                <div
                  aria-hidden="true"
                  style={{
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    borderRadius: 6,
                    border: "2px solid",
                    borderColor: isChecked ? "var(--st-clean, #059669)" : "#CBD5E1",
                    backgroundColor: isChecked ? "var(--st-clean, #059669)" : "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                    boxShadow: isChecked ? "0 2px 4px rgba(5, 150, 105, 0.25)" : "none",
                  }}
                >
                  {isChecked && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                {/* Item Label & Tag */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isChecked ? "var(--text-secondary, #475569)" : "var(--text-main, #0F172A)",
                        textDecoration: isChecked ? "line-through" : "none",
                        opacity: isChecked ? 0.8 : 1,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {item.label}
                    </span>

                    {item.mandatory ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: isChecked ? "var(--st-clean, #059669)" : "#FEF2F2",
                          color: isChecked ? "#FFFFFF" : "#DC2626",
                          border: `1px solid ${isChecked ? "var(--st-clean, #059669)" : "#FECACA"}`,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {isChecked ? "Done" : "Required"}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "var(--bg-muted, #F1F5F9)",
                          color: "var(--text-muted, #64748B)",
                          border: "1px solid var(--border-default, #E2E8F0)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
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
            style={{
              padding: "12px 20px",
              minHeight: 44,
              borderRadius: 10,
              border: "1px solid var(--border-default, #E2E8F0)",
              background: "#FFFFFF",
              color: "var(--text-secondary, #475569)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleCompleteCleaning}
            disabled={submitting || !allMandatoryCompleted}
            style={{
              padding: "12px 24px",
              minHeight: 44,
              borderRadius: 10,
              border: "none",
              background: allMandatoryCompleted
                ? "linear-gradient(135deg, var(--color-primary, #1E3A8A), #1D4ED8)"
                : "var(--bg-muted, #E2E8F0)",
              color: allMandatoryCompleted ? "#FFFFFF" : "var(--text-muted, #94A3B8)",
              fontWeight: 700,
              fontSize: 14,
              cursor: allMandatoryCompleted && !submitting ? "pointer" : "not-allowed",
              boxShadow: allMandatoryCompleted ? "0 4px 12px rgba(30, 58, 138, 0.25)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
          >
            {submitting ? (
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
                <span>Submitting for Inspection...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                  {allMandatoryCompleted
                    ? "Complete Cleaning & Submit for Inspection"
                    : `Complete (${mandatoryItems.length - completedMandatory} Required Remaining)`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomDoc, RoomPriority, ServiceType } from "@/lib/models";
import { useAttendants } from "@/lib/useAttendants";

interface AssignmentModalProps {
  room: RoomDoc;
  onClose: () => void;
  onComplete: (updated: RoomDoc) => void;
}

export function AssignmentModal({ room, onClose, onComplete }: AssignmentModalProps) {
  const [attendant, setAttendant] = useState(room.attendant || "");
  const roster = useAttendants();
  // Keep the current attendant selectable even if they are no longer on the roster.
  const attendants = room.attendant && !roster.includes(room.attendant) ? [room.attendant, ...roster] : roster;
  const [priority, setPriority] = useState<RoomPriority>(room.priority || "standard");
  const [serviceType, setServiceType] = useState<ServiceType>(room.serviceType || "stayover");
  const [instructions, setInstructions] = useState(room.instructions || "");
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

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const firstInput = dialogRef.current.querySelector<HTMLElement>("select, input, textarea, button.modal-close-btn");
        firstInput?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          attendant: attendant || null,
          priority,
          serviceType,
          instructions: instructions || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign room");
      onComplete(data.room);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving assignment");
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
        aria-labelledby="assignment-modal-title"
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid var(--border-default, #E2E8F0)",
          borderTop: "4px solid var(--color-primary, #1E3A8A)",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0,0,0,0.05)",
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
              Supervisor Room Assignment
            </div>
            <h2
              id="assignment-modal-title"
              style={{
                margin: "4px 0 0",
                fontSize: "1.3rem",
                fontWeight: 700,
                fontFamily: "'Playfair Display SC', Georgia, serif",
                color: "var(--text-main, #0F172A)",
              }}
            >
              Suite {room.id} ({room.type})
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted, #64748B)", marginTop: 2 }}>
              Floor {room.floor} · Current Status: <strong style={{ color: "var(--text-secondary, #334155)" }}>{room.status.toUpperCase()}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assignment dialog"
            className="modal-close-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: "20px 24px", display: "grid", gap: 16 }}>
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

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
            Assigned Housekeeper
            <select
              value={attendant}
              onChange={(e) => setAttendant(e.target.value)}
              style={{
                padding: "11px 12px",
                minHeight: 44,
                borderRadius: 8,
                border: "1px solid var(--border-default, #E2E8F0)",
                background: "#FFFFFF",
                fontSize: 14,
                fontWeight: 500,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">-- Unassigned (Available Pool) --</option>
              {attendants.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
              Priority Level
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RoomPriority)}
                style={{
                  padding: "11px 12px",
                  minHeight: 44,
                  borderRadius: 8,
                  border: "1px solid var(--border-default, #E2E8F0)",
                  background: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="urgent">Urgent · Next Guest In</option>
                <option value="high">High Priority</option>
                <option value="standard">Standard Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
              Service Type
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                style={{
                  padding: "11px 12px",
                  minHeight: 44,
                  borderRadius: 8,
                  border: "1px solid var(--border-default, #E2E8F0)",
                  background: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="turnover">Checkout Turnover</option>
                <option value="stayover">Weekly Stayover</option>
                <option value="touchup">Touch-up / Refresh</option>
              </select>
            </label>
          </div>

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
            Supervisor Instructions & Notes
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. VIP guest checking in early, prepare extra kitchen dish kit, fresh blankets..."
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-default, #E2E8F0)",
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
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
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "11px 22px",
                minHeight: 44,
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, var(--color-primary, #1E3A8A), #1D4ED8)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(30, 58, 138, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              {submitting ? (
                <>
                  <svg
                    style={{ animation: "spin 1s linear infinite" }}
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Save Assignment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomDoc } from "@/lib/models";
import { MAINTENANCE_CATEGORIES } from "@/lib/models";
import { PhotoPicker } from "./PhotoPicker";

interface MaintenanceModalProps {
  room: RoomDoc;
  reportedByName: string;
  onClose: () => void;
  onComplete: (updated: RoomDoc) => void;
}

export function MaintenanceModal({ room, reportedByName, onClose, onComplete }: MaintenanceModalProps) {
  const [category, setCategory] = useState(MAINTENANCE_CATEGORIES[0]);
  const [priority, setPriority] = useState<"urgent" | "high" | "medium" | "low">("medium");
  const [description, setDescription] = useState("");
  const [takeOutOfService, setTakeOutOfService] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg("Please provide a description of the maintenance issue.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_maintenance",
          userName: reportedByName,
          maintenanceIssue: {
            category,
            description: description.trim(),
            priority: takeOutOfService ? "urgent" : priority,
            photoUrl: photoUrl || undefined,
          },
          status: takeOutOfService ? "ooo" : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit maintenance report");
      onComplete(data.room);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error submitting report");
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
        aria-labelledby="maintenance-modal-title"
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid var(--border-default, #E2E8F0)",
          borderTop: "4px solid #DC2626",
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
            background: "linear-gradient(to bottom, #FEF2F2, #FFFFFF)",
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
                color: "#DC2626",
                letterSpacing: "1.2px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              Engineering & Maintenance Ticket
            </div>
            <h2
              id="maintenance-modal-title"
              style={{
                margin: "4px 0 0",
                fontSize: "1.3rem",
                fontWeight: 700,
                fontFamily: "'Playfair Display SC', Georgia, serif",
                color: "var(--text-main, #0F172A)",
              }}
            >
              Report Issue for Suite {room.id}
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted, #64748B)", marginTop: 2 }}>
              Reported by: <strong style={{ color: "var(--text-secondary, #334155)" }}>{reportedByName || "Staff"}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close maintenance dialog"
            className="modal-close-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "grid", gap: 16 }}>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
              Issue Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
                {MAINTENANCE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
              Priority Level
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "urgent" | "high" | "medium" | "low")}
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
                <option value="urgent">Urgent · Guest Impact</option>
                <option value="high">High · Needs Fix Today</option>
                <option value="medium">Medium · Standard</option>
                <option value="low">Low · Non-critical</option>
              </select>
            </label>
          </div>

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
            Description of Problem
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs repair (e.g., tub drain clogged, PTAC blowing warm air, door latch loose)..."
              required
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

          <div style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
            Photo Documentation (optional)
            <PhotoPicker value={photoUrl} onChange={setPhotoUrl} userName={reportedByName} />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              minHeight: 48,
              borderRadius: 10,
              border: "1px solid",
              borderColor: takeOutOfService ? "#FECACA" : "var(--border-default, #E2E8F0)",
              background: takeOutOfService ? "#FEF2F2" : "var(--bg-muted, #F8FAFC)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <input
              type="checkbox"
              checked={takeOutOfService}
              onChange={(e) => setTakeOutOfService(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: "#DC2626", cursor: "pointer" }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: takeOutOfService ? "#DC2626" : "var(--text-main, #0F172A)" }}>
                Room is unusable — Place Out of Service (OOO)
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted, #64748B)" }}>
                Blocks suite from assignment until maintenance completes and signs off.
              </div>
            </div>
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
                background: "#DC2626",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(220, 38, 38, 0.3)",
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
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Submit Maintenance Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

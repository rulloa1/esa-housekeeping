"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomDoc } from "@/lib/models";
import { SUPPLY_ITEMS } from "@/lib/models";

interface SupplyModalProps {
  room: RoomDoc;
  requestedByName: string;
  onClose: () => void;
  onComplete: (updated: RoomDoc) => void;
}

export function SupplyModal({ room, requestedByName, onClose, onComplete }: SupplyModalProps) {
  const [item, setItem] = useState(SUPPLY_ITEMS[0]);
  const [quantity, setQuantity] = useState(2);
  const [priority, setPriority] = useState<"urgent" | "high" | "standard">("standard");
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
        const firstInput = dialogRef.current.querySelector<HTMLElement>("select, input, button.modal-close-btn");
        firstInput?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_supplies",
          userName: requestedByName,
          supplyRequest: {
            item,
            quantity: Number(quantity),
            priority,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit supply request");
      onComplete(data.room);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error submitting request");
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
        aria-labelledby="supply-modal-title"
        style={{
          width: "100%",
          maxWidth: 500,
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
              Housekeeping Supply Requisition
            </div>
            <h2
              id="supply-modal-title"
              style={{
                margin: "4px 0 0",
                fontSize: "1.3rem",
                fontWeight: 700,
                fontFamily: "'Playfair Display SC', Georgia, serif",
                color: "var(--text-main, #0F172A)",
              }}
            >
              Request Supplies for Suite {room.id}
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted, #64748B)", marginTop: 2 }}>
              Requested by: <strong style={{ color: "var(--text-secondary, #334155)" }}>{requestedByName || "Housekeeper"}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close supply dialog"
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

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
            Supply Item
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
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
              {SUPPLY_ITEMS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
              Quantity Needed
              <input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  padding: "11px 12px",
                  minHeight: 44,
                  borderRadius: 8,
                  border: "1px solid var(--border-default, #E2E8F0)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary, #334155)" }}>
              Urgency Level
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "urgent" | "high" | "standard")}
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
                <option value="urgent">Urgent · Out of Stock</option>
                <option value="high">High · Needed Today</option>
                <option value="standard">Standard · Regular Stock</option>
              </select>
            </label>
          </div>

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
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Send Requisition</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<"ticket" | "lock">("ticket");
  const [lockBattery, setLockBattery] = useState<number>(room.lockBattery ?? 92);
  const [deadbolt, setDeadbolt] = useState<boolean>(Boolean(room.deadboltEngaged));
  const [lockActionBusy, setLockActionBusy] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
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

  // Supervisor Emergency Master Key Unlatch
  const handleEmergencyUnlock = async () => {
    setLockActionBusy(true);
    setLockMessage(null);
    try {
      const now = new Date().toISOString();
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_room",
          userName: reportedByName,
          data: {
            deadboltEngaged: false,
            deadboltEngagedAt: null,
            lastUnlockedAt: now,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger emergency unlatch");
      setDeadbolt(false);
      setLockMessage("Door lock solenoid energized! Solenoid released & deadbolt retracted.");
      onComplete(data.room);
    } catch (err: unknown) {
      setLockMessage(err instanceof Error ? err.message : "Override signal failed.");
    } finally {
      setLockActionBusy(false);
    }
  };

  // Supervisor Reset 4x AA Battery Pack Counter
  const handleResetBattery = async () => {
    setLockActionBusy(true);
    setLockMessage(null);
    try {
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_room",
          userName: reportedByName,
          data: { lockBattery: 100 },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset battery");
      setLockBattery(100);
      setLockMessage("Battery counter reset to 100% (New 4x AA pack confirmed).");
      onComplete(data.room);
    } catch (err: unknown) {
      setLockMessage(err instanceof Error ? err.message : "Battery reset failed.");
    } finally {
      setLockActionBusy(false);
    }
  };

  // Toggle Deadbolt State
  const handleToggleDeadbolt = async () => {
    setLockActionBusy(true);
    setLockMessage(null);
    try {
      const nextDeadbolt = !deadbolt;
      const now = new Date().toISOString();
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_room",
          userName: reportedByName,
          data: {
            deadboltEngaged: nextDeadbolt,
            deadboltEngagedAt: nextDeadbolt ? now : null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle deadbolt");
      setDeadbolt(nextDeadbolt);
      setLockMessage(nextDeadbolt ? "Deadbolt thrown (DND active)." : "Deadbolt retracted.");
      onComplete(data.room);
    } catch (err: unknown) {
      setLockMessage(err instanceof Error ? err.message : "Deadbolt toggle failed.");
    } finally {
      setLockActionBusy(false);
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
          maxWidth: 540,
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid var(--border-default, #E2E8F0)",
          borderTop: activeTab === "ticket" ? "4px solid #DC2626" : "4px solid #1E3A8A",
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
            background: activeTab === "ticket" ? "linear-gradient(to bottom, #FEF2F2, #FFFFFF)" : "linear-gradient(to bottom, #EFF6FF, #FFFFFF)",
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
                color: activeTab === "ticket" ? "#DC2626" : "#1E3A8A",
                letterSpacing: "1.2px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              {activeTab === "ticket" ? "Engineering & Maintenance Ticket" : "Commercial Lock Telemetry & Hardware"}
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
              Suite {room.id} · {activeTab === "ticket" ? "Report Issue" : "Electronic Door Lock"}
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted, #64748B)", marginTop: 2 }}>
              Staff Operator: <strong style={{ color: "var(--text-secondary, #334155)" }}>{reportedByName || "Supervisor"}</strong>
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

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-default, #E2E8F0)",
            backgroundColor: "#F8FAFC",
            padding: "0 24px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("ticket")}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "ticket" ? "3px solid #DC2626" : "3px solid transparent",
              color: activeTab === "ticket" ? "#DC2626" : "#64748B",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🔧</span>
            <span>Maintenance Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("lock")}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "lock" ? "3px solid #1E3A8A" : "3px solid transparent",
              color: activeTab === "lock" ? "#1E3A8A" : "#64748B",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🔒</span>
            <span>Lock Diagnostics & Battery</span>
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 10,
                backgroundColor: lockBattery > 25 ? "#DCFCE7" : "#FEE2E2",
                color: lockBattery > 25 ? "#166534" : "#991B1B",
                fontWeight: 800,
              }}
            >
              {lockBattery}%
            </span>
          </button>
        </div>

        {activeTab === "lock" ? (
          /* Lock Diagnostics & Hardware Override Screen */
          <div style={{ padding: "20px 24px", display: "grid", gap: 16 }}>
            {lockMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  backgroundColor: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  color: "#166534",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ✓ {lockMessage}
              </div>
            )}

            {/* Hardware Identity Card */}
            <div
              style={{
                padding: "16px",
                borderRadius: 12,
                backgroundColor: "#0F172A",
                color: "#FFFFFF",
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#38BDF8", textTransform: "uppercase", letterSpacing: 1 }}>
                    Installed Lock Hardware
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
                    {room.lockModel || "Onity Trillium DirectKey RFID/BLE"}
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>
                    Firmware: {room.lockFirmware || "v4.2.1-SECURE"} · BLE Signal: {room.lockSignalRssi || "-46 dBm"}
                  </div>
                </div>

                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    backgroundColor: deadbolt ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)",
                    color: deadbolt ? "#FCA5A5" : "#6EE7B7",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {deadbolt ? "🔒 Deadbolt Thrown" : "🟢 Unlocked Latch"}
                </span>
              </div>

              {/* Battery Meter */}
              <div style={{ padding: "12px", backgroundColor: "rgba(255, 255, 255, 0.06)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span>4x AA Battery Pack Level</span>
                  <strong style={{ color: lockBattery > 25 ? "#34D399" : "#F87171" }}>
                    {lockBattery}% ({(5.2 + (lockBattery / 100) * 0.9).toFixed(2)} V)
                  </strong>
                </div>
                <div style={{ width: "100%", height: 8, backgroundColor: "rgba(255, 255, 255, 0.15)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${lockBattery}%`,
                      height: "100%",
                      backgroundColor: lockBattery > 25 ? "#10B981" : "#EF4444",
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>
                  {lockBattery > 25 ? "Standard battery pack voltage healthy." : "⚠️ Battery low: replace with 4 fresh AA alkaline batteries."}
                </div>
              </div>
            </div>

            {/* Supervisor Actions */}
            <div style={{ display: "grid", gap: 10 }}>
              <button
                type="button"
                onClick={handleEmergencyUnlock}
                disabled={lockActionBusy}
                style={{
                  padding: "12px",
                  borderRadius: 10,
                  backgroundColor: "#1E3A8A",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: lockActionBusy ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>🔑</span>
                <span>Send Emergency Master Solenoid Release (Door Unlock)</span>
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleToggleDeadbolt}
                  disabled={lockActionBusy}
                  style={{
                    padding: "10px",
                    borderRadius: 10,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--border-default, #CBD5E1)",
                    color: "var(--text-main, #0F172A)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {deadbolt ? "Retract Deadbolt" : "Throw Deadbolt"}
                </button>

                <button
                  type="button"
                  onClick={handleResetBattery}
                  disabled={lockActionBusy}
                  style={{
                    padding: "10px",
                    borderRadius: 10,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--border-default, #CBD5E1)",
                    color: "var(--text-main, #0F172A)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Reset Battery to 100%
                </button>
              </div>
            </div>
          </div>
        ) : (
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

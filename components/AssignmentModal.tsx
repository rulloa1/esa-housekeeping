"use client";

import { useState } from "react";
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
          maxWidth: 480,
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
              Supervisor Room Assignment
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>
              Suite {room.id} ({room.type})
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: "20px", display: "grid", gap: 16 }}>
          {errorMsg && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEE2E2", color: "#DC2626", fontSize: 13, fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
            Assigned Housekeeper
            <select
              value={attendant}
              onChange={(e) => setAttendant(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                background: "#FFFFFF",
                fontSize: 14,
                outline: "none",
              }}
            >
              <option value="">-- Unassigned --</option>
              {attendants.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
              Priority Level
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RoomPriority)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: "#FFFFFF",
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="urgent">🔴 Urgent (Next Guest)</option>
                <option value="high">🟠 High Priority</option>
                <option value="standard">🟡 Standard Priority</option>
                <option value="low">⚪ Low Priority</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
              Service Type
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: "#FFFFFF",
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="turnover">Checkout Turnover</option>
                <option value="stayover">Weekly Stayover</option>
                <option value="touchup">Touch-up / Refresh</option>
              </select>
            </label>
          </div>

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
            Supervisor Instructions & Notes
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. VIP guest checking in at 2 PM, prepare extra kitchen dish kit and fresh blankets..."
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
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
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "var(--esa-green)",
                color: "#FFFFFF",
                fontWeight: 700,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {submitting ? "Saving..." : "Save Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

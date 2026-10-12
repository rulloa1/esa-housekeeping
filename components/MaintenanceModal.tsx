"use client";

import { useState } from "react";
import type { RoomDoc } from "@/lib/models";
import { MAINTENANCE_CATEGORIES } from "@/lib/models";

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
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
        backgroundColor: "rgba(30, 20, 10, 0.6)",
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
            background: "#FEF2F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#DC2626", letterSpacing: 0.8 }}>
              Engineering & Maintenance Ticket
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>
              Report Issue for Suite {room.id}
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

        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "grid", gap: 14 }}>
          {errorMsg && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEE2E2", color: "#DC2626", fontSize: 13, fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
            Issue Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                background: "#FFFFFF",
                fontSize: 14,
                outline: "none",
              }}
            >
              {MAINTENANCE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "urgent" | "high" | "medium" | "low")}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                background: "#FFFFFF",
                fontSize: 14,
                outline: "none",
              }}
            >
              <option value="urgent">🔴 Urgent (Guest impacted / Leaks)</option>
              <option value="high">🟠 High (Needs resolution today)</option>
              <option value="medium">🟡 Medium (Standard turnaround)</option>
              <option value="low">⚪ Low (Cosmetic / Non-critical)</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
            Description of Problem
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide exact details (e.g. bathroom tub drain overflowing, PTAC making loud humming noise)..."
              required
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

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              background: takeOutOfService ? "#FEF2F2" : "#F9FAFB",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={takeOutOfService}
              onChange={(e) => setTakeOutOfService(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#DC2626" }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: takeOutOfService ? "#DC2626" : "var(--text-main)" }}>
                Room is unusable — Place Out of Service (OOO)
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Blocks room from occupancy until maintenance verifies resolution.
              </div>
            </div>
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
                background: "#DC2626",
                color: "#FFFFFF",
                fontWeight: 700,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {submitting ? "Submitting..." : "Submit Maintenance Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

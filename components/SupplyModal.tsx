"use client";

import { useState } from "react";
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
          maxWidth: 460,
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
            background: "var(--esa-brown-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--esa-brown)", letterSpacing: 0.8 }}>
              Housekeeping Supply Requisition
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>
              Request Supplies for Suite {room.id}
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
            Supply Item
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                background: "#FFFFFF",
                fontSize: 14,
                outline: "none",
              }}
            >
              {SUPPLY_ITEMS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
              Quantity Needed
              <input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--esa-brown)" }}>
              Urgency
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "urgent" | "high" | "standard")}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: "#FFFFFF",
                  fontSize: 14,
                  outline: "none",
                }}
              >
                <option value="urgent">🔴 Urgent (Stockout)</option>
                <option value="high">🟠 High (Needed now)</option>
                <option value="standard">🟡 Standard Replenish</option>
              </select>
            </label>
          </div>

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
              {submitting ? "Submitting..." : "Send Requisition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

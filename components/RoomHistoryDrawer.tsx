"use client";

import { useState } from "react";
import { isGuestTask, type RoomDoc } from "@/lib/models";

interface RoomHistoryDrawerProps {
  room: RoomDoc;
  onClose: () => void;
  // Supervisors can resolve maintenance and mark supplies delivered; anyone can close a guest request.
  canManage?: boolean;
  userName?: string;
  onUpdated?: (room: RoomDoc) => void;
}

const GUEST_LABEL: Record<string, string> = {
  cleaning: "Cleaning requested",
  towels: "Fresh towels requested",
  amenities: "Amenities refill requested",
  dnd_on: "Do Not Disturb on",
  dnd_off: "Do Not Disturb off",
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const actionButton = {
  padding: "6px 12px",
  minHeight: 32,
  borderRadius: 8,
  border: "1px solid var(--esa-green)",
  background: "#FFFFFF",
  color: "var(--esa-green)",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

export function RoomHistoryDrawer({ room, onClose, canManage = false, userName, onUpdated }: RoomHistoryDrawerProps) {
  const history = room.history || [];
  const maintenance = room.maintenanceIssues || [];
  const supplies = room.supplyRequests || [];
  const guestRequests = room.guestRequests || [];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sends one close-out action (resolve_maintenance, fulfill_supplies, guest_request_done).
  const act = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, userName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save. Try again.");
      onUpdated?.(data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(30, 20, 10, 0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          height: "100%",
          backgroundColor: "#FFFFFF",
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
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--esa-brown)", letterSpacing: 0.8 }}>
              Audit History & Room Details
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>
              Suite {room.id} ({room.type})
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Floor {room.floor} · Status: <strong>{room.status.replace("_", " ").toUpperCase()}</strong>
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
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "grid", gap: 20 }}>
          {/* Quick Info Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              padding: 12,
              borderRadius: 10,
              background: "var(--bg-muted)",
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", fontSize: 11 }}>Attendant</span>
              <strong>{room.attendant || "Unassigned"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", fontSize: 11 }}>Priority</span>
              <strong>{room.priority.toUpperCase()}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", fontSize: 11 }}>Service Type</span>
              <strong>{room.serviceType === "turnover" ? "Checkout Turnover" : "Stayover Refresh"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", fontSize: 11 }}>Last Inspection</span>
              <strong>{room.inspectionResult ? `${room.inspectionResult.toUpperCase()} by ${room.inspectedBy}` : "Pending"}</strong>
            </div>
          </div>

          {room.instructions && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FFFBEB", borderLeft: "4px solid #D97706", fontSize: 13 }}>
              <strong style={{ color: "#92400E", display: "block", marginBottom: 2 }}>Supervisor Instructions:</strong>
              {room.instructions}
            </div>
          )}

          {room.guestNote && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#EFF6FF", borderLeft: "4px solid #2563EB", fontSize: 13 }}>
              <strong style={{ color: "#1E40AF", display: "block", marginBottom: 2 }}>Guest Note / Preference:</strong>
              {room.guestNote}
            </div>
          )}

          {error && (
            <div role="alert" style={{ padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", color: "#B91C1C", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Guest Requests */}
          {guestRequests.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#1D4ED8" }}>
                Guest Requests ({guestRequests.filter((g) => isGuestTask(g.type) && !g.doneAt).length} open)
              </h3>
              <div style={{ display: "grid", gap: 8 }}>
                {guestRequests.map((g) => (
                  <div
                    key={g.at}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #BFDBFE",
                      background: isGuestTask(g.type) && !g.doneAt ? "#EFF6FF" : "#FFFFFF",
                      fontSize: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div>
                      <strong>{GUEST_LABEL[g.type] ?? g.type}</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        {timeOf(g.at)}
                        {g.doneAt ? ` · Done by ${g.doneBy} at ${timeOf(g.doneAt)}` : ""}
                      </div>
                    </div>
                    {isGuestTask(g.type) && !g.doneAt && onUpdated && (
                      <button
                        type="button"
                        style={actionButton}
                        disabled={busy !== null}
                        onClick={() => act(`g-${g.at}`, { action: "guest_request_done", requestAt: g.at })}
                      >
                        {busy === `g-${g.at}` ? "Saving…" : "Mark done"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance Issues */}
          {maintenance.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#DC2626" }}>
                Maintenance Tickets ({maintenance.length})
              </h3>
              <div style={{ display: "grid", gap: 8 }}>
                {maintenance.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #FECACA",
                      background: "#FEF2F2",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#DC2626" }}>
                      <span>{m.category}</span>
                      <span>[{m.status.toUpperCase()}]</span>
                    </div>
                    <div style={{ margin: "4px 0", color: "var(--text-main)" }}>{m.description}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      Reported by {m.reportedBy} at {timeOf(m.reportedAt)}
                      {m.resolvedAt ? ` · Resolved by ${m.resolvedBy} at ${timeOf(m.resolvedAt)}` : ""}
                    </div>
                    {m.status !== "resolved" && canManage && onUpdated && (
                      <button
                        type="button"
                        style={{ ...actionButton, marginTop: 8 }}
                        disabled={busy !== null}
                        onClick={() => act(`m-${m.id}`, { action: "resolve_maintenance", issueId: m.id })}
                      >
                        {busy === `m-${m.id}` ? "Saving…" : room.status === "maintenance" ? "Resolve & return to service" : "Mark resolved"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supply Requests */}
          {supplies.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--esa-brown)" }}>
                Supply Requests ({supplies.length})
              </h3>
              <div style={{ display: "grid", gap: 8 }}>
                {supplies.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border-subtle)",
                      background: "#FFFFFF",
                      fontSize: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{s.quantity}x {s.item}</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        Requested by {s.requestedBy}
                      </div>
                    </div>
                    {s.status !== "fulfilled" && canManage && onUpdated ? (
                      <button
                        type="button"
                        style={actionButton}
                        disabled={busy !== null}
                        onClick={() => act(`s-${s.id}`, { action: "fulfill_supplies", requestId: s.id })}
                      >
                        {busy === `s-${s.id}` ? "Saving…" : "Mark delivered"}
                      </button>
                    ) : (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                        background: s.status === "fulfilled" ? "#D1FAE5" : "#FEF3C7",
                        color: s.status === "fulfilled" ? "#065F46" : "#92400E",
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      {s.status.toUpperCase()}
                    </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--esa-brown)" }}>
              Shift Activity Log
            </h3>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No shift activity recorded yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 12, borderLeft: "2px solid var(--border-default)", paddingLeft: 14 }}>
                {history.map((entry) => (
                  <div key={entry.id} style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: -20,
                        top: 4,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "var(--esa-green)",
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ fontSize: 13, color: "var(--text-main)" }}>{entry.event}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{entry.details}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      By {entry.by} ({entry.role})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", background: "#FBF9F5" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid var(--border-default)",
              background: "#FFFFFF",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

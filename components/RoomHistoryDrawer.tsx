"use client";

import { useEffect, useState } from "react";
import { isGuestTask, type RoomDoc } from "@/lib/models";
import { PhotoThumb } from "./PhotoPicker";

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
  border: "1px solid var(--color-primary)",
  background: "#FFFFFF",
  color: "var(--color-primary)",
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

  // Dismiss on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-drawer-title"
        style={{
          width: "100%",
          maxWidth: 480,
          height: "100%",
          backgroundColor: "#FFFFFF",
          boxShadow: "var(--shadow-xl)",
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
            background: "var(--color-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-primary)", letterSpacing: 0.8 }}>
              Audit History & Room Details
            </div>
            <h2 id="history-drawer-title" style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "var(--text-main)" }}>
              Suite {room.id} ({room.type})
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Floor {room.floor} · Status: <strong>{room.status.replace("_", " ").toUpperCase()}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close room details drawer"
            className="modal-close-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "grid", gap: 20, alignContent: "start" }}>
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
              {room.inspectionResult === "fail" && room.inspectionPhotoUrl && (
                <div style={{ marginTop: 4 }}><PhotoThumb url={room.inspectionPhotoUrl} size={48} label="Photo from the inspection" /></div>
              )}
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

          {/* Electronic Lock & Deadbolt Hardware Telemetry */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              backgroundColor: "#0F172A",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "#38BDF8" }}>
                  Commercial Electronic Lock
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginTop: 2 }}>
                  {room.lockModel || "Onity Trillium DirectKey RFID/BLE"}
                </div>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: 20,
                  backgroundColor: room.deadboltEngaged ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                  color: room.deadboltEngaged ? "#F87171" : "#34D399",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: room.deadboltEngaged ? "#EF4444" : "#10B981",
                  }}
                />
                {room.deadboltEngaged ? "Deadbolt Thrown (DND)" : "Latching Normal"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, backgroundColor: "rgba(255, 255, 255, 0.05)", padding: 10, borderRadius: 8 }}>
              <div>
                <span style={{ color: "#94A3B8", display: "block" }}>Battery (4x AA)</span>
                <strong style={{ color: (room.lockBattery ?? 92) > 25 ? "#34D399" : "#F87171", fontSize: 13 }}>
                  {room.lockBattery ?? 92}%
                </strong>
              </div>
              <div>
                <span style={{ color: "#94A3B8", display: "block" }}>BLE Signal</span>
                <strong style={{ color: "#38BDF8" }}>{room.lockSignalRssi || "-46 dBm"}</strong>
              </div>
              <div>
                <span style={{ color: "#94A3B8", display: "block" }}>Firmware</span>
                <strong style={{ color: "#CBD5E1" }}>{room.lockFirmware || "v4.2.1"}</strong>
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: "#94A3B8", display: "flex", justifyContent: "space-between" }}>
              <span>Optical LED: <strong style={{ color: "#34D399" }}>Green Active</strong></span>
              <span>Last Unlock: <strong>{room.lastUnlockedAt ? timeOf(room.lastUnlockedAt) : "Staff Keypad"}</strong></span>
            </div>
          </div>

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
                    {m.photoUrl && <div style={{ margin: "6px 0" }}><PhotoThumb url={m.photoUrl} label={`Photo of ${m.category} issue`} /></div>}
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

"use client";

import { useState, useEffect, useMemo } from "react";
import type { RoomDoc, RoomStatus, Role } from "@/lib/models";
import { STAFF_ATTENDANTS, DEFAULT_CHECKLIST_TEMPLATE } from "@/lib/models";
import { NavigationHeader } from "./NavigationHeader";
import { ChecklistModal } from "./ChecklistModal";
import { MaintenanceModal } from "./MaintenanceModal";
import { SupplyModal } from "./SupplyModal";
import { RoomHistoryDrawer } from "./RoomHistoryDrawer";

interface HousekeeperViewProps {
  initialDocs: Record<string, RoomDoc>;
  initialVersion: number;
  currentRole: Role;
}

export function HousekeeperView({ initialDocs, initialVersion, currentRole }: HousekeeperViewProps) {
  const [docs, setDocs] = useState<Record<string, RoomDoc>>(initialDocs);
  const [version, setVersion] = useState<number>(initialVersion);
  const [selectedAttendant, setSelectedAttendant] = useState<string>("Maria S.");
  const [viewScope, setViewScope] = useState<"assigned" | "all">("assigned");
  const [activeFloor, setActiveFloor] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Modals
  const [checklistRoom, setChecklistRoom] = useState<RoomDoc | null>(null);
  const [maintenanceRoom, setMaintenanceRoom] = useState<RoomDoc | null>(null);
  const [supplyRoom, setSupplyRoom] = useState<RoomDoc | null>(null);
  const [historyRoom, setHistoryRoom] = useState<RoomDoc | null>(null);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Live polling
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await fetch(`/api/suites?since=${version}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (!json.unchanged && json.docs) {
            setDocs(json.docs);
            setVersion(json.version);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
      timer = setTimeout(poll, document.hidden ? 15000 : 3000);
    };

    timer = setTimeout(poll, 3000);
    return () => clearTimeout(timer);
  }, [version]);

  const allRooms = useMemo(() => Object.values(docs), [docs]);

  // Rooms filtered by staff assignment and options
  const myRooms = useMemo(() => {
    return allRooms.filter((r) => r.attendant === selectedAttendant);
  }, [allRooms, selectedAttendant]);

  const displayedRooms = useMemo(() => {
    const source = viewScope === "assigned" ? myRooms : allRooms;

    return source.filter((r) => {
      if (activeFloor !== "all" && String(r.floor) !== activeFloor) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => {
      // Prioritize urgent/in_progress first, then room number
      const pOrder: Record<string, number> = { urgent: 0, high: 1, standard: 2, low: 3 };
      const pDiff = (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  }, [myRooms, allRooms, viewScope, activeFloor, statusFilter]);

  // Housekeeper metrics
  const stats = useMemo(() => {
    const total = myRooms.length;
    const completed = myRooms.filter((r) => r.status === "clean" || r.status === "awaiting_inspection").length;
    const inProgress = myRooms.filter((r) => r.status === "in_progress").length;
    const remaining = total - completed;
    const urgent = myRooms.filter((r) => r.priority === "urgent" && r.status !== "clean").length;
    return { total, completed, inProgress, remaining, urgent };
  }, [myRooms]);

  const handleStartCleaning = async (room: RoomDoc) => {
    try {
      const res = await fetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_cleaning",
          attendant: selectedAttendant,
          userName: selectedAttendant,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs((prev) => ({ ...prev, [room.id]: data.room }));
      showToast(`Started cleaning Suite ${room.id}`);
    } catch {
      showToast("Error starting cleaning session");
    }
  };

  const handleRoomUpdated = (updated: RoomDoc) => {
    setDocs((prev) => ({ ...prev, [updated.id]: updated }));
  };

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case "dirty":
        return { label: "Dirty", bg: "var(--st-dirty-bg)", color: "var(--st-dirty)", border: "var(--st-dirty-border)" };
      case "assigned":
        return { label: "Assigned", bg: "var(--st-assigned-bg)", color: "var(--st-assigned)", border: "var(--st-assigned-border)" };
      case "in_progress":
        return { label: "Cleaning in Progress", bg: "var(--st-in-prog-bg)", color: "var(--st-in-prog)", border: "var(--st-in-prog-border)" };
      case "awaiting_inspection":
        return { label: "Awaiting Inspection", bg: "var(--st-awaiting-insp-bg)", color: "var(--st-awaiting-insp)", border: "var(--st-awaiting-insp-border)" };
      case "inspection_failed":
        return { label: "Correction Required", bg: "var(--st-insp-fail-bg)", color: "var(--st-insp-fail)", border: "var(--st-insp-fail-border)" };
      case "clean":
        return { label: "Clean & Inspected", bg: "var(--st-clean-bg)", color: "var(--st-clean)", border: "var(--st-clean-border)" };
      case "maintenance":
        return { label: "Maintenance", bg: "var(--st-maint-bg)", color: "var(--st-maint)", border: "var(--st-maint-border)" };
      case "ooo":
        return { label: "Out of Service", bg: "var(--st-ooo-bg)", color: "var(--st-ooo)", border: "var(--st-ooo-border)" };
      default:
        return { label: status, bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <style>{`
        .hk-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        @media (max-width: 480px) {
          .hk-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
      <NavigationHeader currentRole={currentRole} activeTab="housekeeper" />

      {/* Housekeeper Hero / Shift Bar */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", padding: "16px 16px 12px" }}>
          {/* Staff Switcher & Shift Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--esa-brown)" }}>Housekeeper:</span>
              <select
                value={selectedAttendant}
                onChange={(e) => setSelectedAttendant(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  fontWeight: 700,
                  fontSize: 14,
                  backgroundColor: "var(--esa-brown-soft)",
                  color: "var(--esa-brown)",
                  outline: "none",
                }}
              >
                {STAFF_ATTENDANTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>Shift: 7:00 AM – 3:30 PM</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--st-clean)", display: "inline-block" }}></span>
              <span>Live Synced</span>
            </div>
          </div>

          {/* Shift Metrics Grid */}
          <div className="hk-stats-grid">
            <div style={{ padding: "10px", borderRadius: 10, background: "var(--bg-muted)", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Assigned</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--esa-brown)" }}>{stats.total}</div>
            </div>
            <div style={{ padding: "10px", borderRadius: 10, background: "#ECFDF5", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#065F46", textTransform: "uppercase" }}>Done / Insp.</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--st-clean)" }}>{stats.completed}</div>
            </div>
            <div style={{ padding: "10px", borderRadius: 10, background: "#FFFBEB", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>Remaining</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--st-in-prog)" }}>{stats.remaining}</div>
            </div>
            <div style={{ padding: "10px", borderRadius: 10, background: stats.urgent > 0 ? "#FEE2E2" : "var(--bg-muted)", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: stats.urgent > 0 ? "#DC2626" : "var(--text-muted)", textTransform: "uppercase" }}>Urgent</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: stats.urgent > 0 ? "#DC2626" : "var(--text-muted)" }}>{stats.urgent}</div>
            </div>
          </div>

          {/* Scope & Floor Filters */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setViewScope("assigned")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor: viewScope === "assigned" ? "var(--esa-green)" : "var(--border-default)",
                  backgroundColor: viewScope === "assigned" ? "var(--esa-green-soft)" : "#FFFFFF",
                  color: viewScope === "assigned" ? "var(--esa-green-dark)" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                My Rooms ({myRooms.length})
              </button>
              <button
                type="button"
                onClick={() => setViewScope("all")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor: viewScope === "all" ? "var(--esa-green)" : "var(--border-default)",
                  backgroundColor: viewScope === "all" ? "var(--esa-green-soft)" : "#FFFFFF",
                  color: viewScope === "all" ? "var(--esa-green-dark)" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                All Hotel ({allRooms.length})
              </button>
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "1", "2", "3"] as const).map((fl) => (
                <button
                  key={fl}
                  type="button"
                  onClick={() => setActiveFloor(fl)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    borderColor: activeFloor === fl ? "var(--esa-brown)" : "var(--border-default)",
                    backgroundColor: activeFloor === fl ? "var(--esa-brown)" : "#FFFFFF",
                    color: activeFloor === fl ? "#FFFFFF" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {fl === "all" ? "All" : `F${fl}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Room List Container */}
      <main style={{ maxWidth: 840, width: "100%", margin: "0 auto", padding: "16px 16px 80px" }}>
        {/* Toast */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "var(--esa-brown-dark)",
              color: "#FFFFFF",
              padding: "12px 24px",
              borderRadius: "var(--radius-pill)",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: "var(--shadow-lg)",
              zIndex: 2000,
              animation: "fadeIn 0.2s ease",
            }}
          >
            {toastMessage}
          </div>
        )}

        {displayedRooms.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid var(--border-default)",
              marginTop: 12,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--text-main)" }}>No Rooms in Queue</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
              No suites match your current filter on Floor {activeFloor === "all" ? "1-3" : activeFloor}.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {displayedRooms.map((room) => {
              const st = getStatusBadge(room.status);
              const totalChecks = DEFAULT_CHECKLIST_TEMPLATE.length;
              const completedChecks = Object.values(room.checklist || {}).filter(Boolean).length;
              const checkPercent = Math.round((completedChecks / totalChecks) * 100);
              const isTurnover = room.serviceType === "turnover";
              const isUrgent = room.priority === "urgent";

              return (
                <div
                  key={room.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 14,
                    border: isUrgent ? "2px solid #F87171" : "1px solid var(--border-default)",
                    padding: "16px",
                    boxShadow: "var(--shadow-xs)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {/* Top Bar: Room Number, Type & Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)", lineHeight: 1 }}>
                          Suite {room.id}
                        </span>
                        {isUrgent && (
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 4,
                              backgroundColor: "#FEE2E2",
                              color: "#DC2626",
                              fontSize: 11,
                              fontWeight: 800,
                              textTransform: "uppercase",
                            }}
                          >
                            Urgent VIP
                          </span>
                        )}
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            backgroundColor: "var(--bg-muted)",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {isTurnover ? "Checkout Turnover" : "Stayover Refresh"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                        {room.type} · Floor {room.floor}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "5px 10px",
                        borderRadius: "var(--radius-pill)",
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: st.bg,
                        color: st.color,
                        border: `1px solid ${st.border}`,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>

                  {/* Supervisor Instructions & Guest Notes */}
                  {room.instructions && (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        backgroundColor: "#FFFBEB",
                        borderLeft: "3px solid #D97706",
                        fontSize: 12,
                        color: "#92400E",
                      }}
                    >
                      <strong>Supervisor Note:</strong> {room.instructions}
                    </div>
                  )}

                  {room.guestNote && (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        backgroundColor: "#EFF6FF",
                        borderLeft: "3px solid #2563EB",
                        fontSize: 12,
                        color: "#1E40AF",
                      }}
                    >
                      <strong>Guest Request:</strong> {room.guestNote}
                    </div>
                  )}

                  {room.status === "inspection_failed" && room.inspectionFailReasons && room.inspectionFailReasons.length > 0 && (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        backgroundColor: "#FFF1F2",
                        borderLeft: "3px solid #E11D48",
                        fontSize: 12,
                        color: "#BE123C",
                      }}
                    >
                      <strong>QA Correction Needed:</strong> {room.inspectionFailReasons.join(", ")}
                    </div>
                  )}

                  {/* Checklist Progress Meter */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                        Checklist Progress: {completedChecks}/{totalChecks} items
                      </span>
                      <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                        {checkPercent}%
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 6, borderRadius: 3, backgroundColor: "var(--bg-muted)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${checkPercent}%`,
                          height: "100%",
                          backgroundColor: checkPercent === 100 ? "var(--st-clean)" : "var(--esa-green)",
                          transition: "width 0.2s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* Prominent Operational Touch Actions (Phase 6) */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                    {/* START CLEANING button */}
                    {room.status !== "in_progress" && room.status !== "awaiting_inspection" && room.status !== "clean" && (
                      <button
                        type="button"
                        onClick={() => handleStartCleaning(room)}
                        style={{
                          flex: 1,
                          minWidth: 140,
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: "none",
                          backgroundColor: "var(--esa-green)",
                          color: "#FFFFFF",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          boxShadow: "var(--shadow-sm)",
                        }}
                      >
                        <span>▶</span> START CLEANING
                      </button>
                    )}

                    {/* VIEW CHECKLIST button */}
                    <button
                      type="button"
                      onClick={() => setChecklistRoom(room)}
                      style={{
                        flex: 1,
                        minWidth: 140,
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: "1px solid var(--border-default)",
                        backgroundColor: "#FFFFFF",
                        color: "var(--text-main)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <span>📝</span> VIEW CHECKLIST
                    </button>

                    {/* REPORT MAINTENANCE button */}
                    <button
                      type="button"
                      onClick={() => setMaintenanceRoom(room)}
                      style={{
                        padding: "12px 12px",
                        borderRadius: 8,
                        border: "1px solid #FECACA",
                        backgroundColor: "#FFF5F5",
                        color: "#DC2626",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="Report Maintenance Issue"
                    >
                      <span>🔧</span> Maintenance
                    </button>

                    {/* REQUEST SUPPLIES button */}
                    <button
                      type="button"
                      onClick={() => setSupplyRoom(room)}
                      style={{
                        padding: "12px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border-default)",
                        backgroundColor: "#FFFFFF",
                        color: "var(--text-secondary)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="Request Supplies"
                    >
                      <span>📦</span> Supplies
                    </button>

                    {/* History button */}
                    <button
                      type="button"
                      onClick={() => setHistoryRoom(room)}
                      style={{
                        padding: "12px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--border-default)",
                        backgroundColor: "#FFFFFF",
                        color: "var(--text-muted)",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                      title="Room Log"
                    >
                      <span>📋</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      {checklistRoom && (
        <ChecklistModal
          room={checklistRoom}
          attendantName={selectedAttendant}
          onClose={() => setChecklistRoom(null)}
          onComplete={handleRoomUpdated}
        />
      )}

      {maintenanceRoom && (
        <MaintenanceModal
          room={maintenanceRoom}
          reportedByName={selectedAttendant}
          onClose={() => setMaintenanceRoom(null)}
          onComplete={handleRoomUpdated}
        />
      )}

      {supplyRoom && (
        <SupplyModal
          room={supplyRoom}
          requestedByName={selectedAttendant}
          onClose={() => setSupplyRoom(null)}
          onComplete={handleRoomUpdated}
        />
      )}

      {historyRoom && (
        <RoomHistoryDrawer
          room={docs[historyRoom.id] ?? historyRoom}
          onClose={() => setHistoryRoom(null)}
          canManage={["supervisor", "frontdesk", "admin"].includes(currentRole)}
          userName={selectedAttendant}
          onUpdated={handleRoomUpdated}
        />
      )}
    </div>
  );
}

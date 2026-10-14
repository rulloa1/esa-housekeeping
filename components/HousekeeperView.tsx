"use client";

import { useState, useEffect, useMemo } from "react";
import { toRoom, toRooms } from "@/lib/roomView";
import type { RoomDoc, RoomStatus, Role } from "@/lib/models";
import { DEFAULT_CHECKLIST_TEMPLATE } from "@/lib/models";
import { useAttendants } from "@/lib/useAttendants";
import { NavigationHeader } from "./NavigationHeader";
import PageBanner, { BANNERS } from "./PageBanner";
import { ChecklistModal } from "./ChecklistModal";
import { MaintenanceModal } from "./MaintenanceModal";
import { SupplyModal } from "./SupplyModal";
import { RoomHistoryDrawer } from "./RoomHistoryDrawer";
import { HousekeeperAlerts } from "./HousekeeperAlerts";
import { PushToggle } from "./PushToggle";
import { PhotoThumb } from "./PhotoPicker";
import { ConnectionBanner } from "./ConnectionBanner";
import { reliableFetch } from "@/lib/reliableFetch";

interface HousekeeperViewProps {
  initialDocs: Record<string, RoomDoc>;
  initialVersion: number;
  currentRole: Role;
  // Set when the person signed in with their own PIN: the page shows their suites only.
  staffName?: string;
}

export function HousekeeperView({ initialDocs, initialVersion, currentRole, staffName }: HousekeeperViewProps) {
  const [docs, setDocs] = useState<Record<string, RoomDoc>>(initialDocs);
  const [version, setVersion] = useState<number>(initialVersion);
  const attendants = useAttendants();
  const [pickedAttendant, setSelectedAttendant] = useState<string>("Maria S.");
  // A personal sign-in always works as that person; a shared housekeeping PIN picks from the list.
  const selectedAttendant = staffName || (attendants.includes(pickedAttendant) ? pickedAttendant : attendants[0]);
  const [viewScope, setViewScope] = useState<"assigned" | "all">("assigned");
  const [activeFloor, setActiveFloor] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
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
        if (navigator.onLine) console.error("Polling error:", err); // offline is expected; the banner says so
      }
      timer = setTimeout(poll, document.hidden ? 15000 : 3000);
    };

    timer = setTimeout(poll, 3000);
    return () => clearTimeout(timer);
  }, [version]);

  const allRooms = useMemo(() => Object.values(toRooms(docs)), [docs]);

  // Rooms filtered by staff assignment and options
  const myRooms = useMemo(() => {
    return allRooms.filter((r) => r.attendant === selectedAttendant);
  }, [allRooms, selectedAttendant]);

  const displayedRooms = useMemo(() => {
    const source = viewScope === "assigned" ? myRooms : allRooms;

    return source.filter((r) => {
      if (activeFloor !== "all" && String(r.floor) !== activeFloor) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "to_clean" && !(r.status === "dirty" || r.status === "assigned")) return false;
        if (statusFilter === "in_progress" && r.status !== "in_progress") return false;
        if (statusFilter === "done" && !(r.status === "clean" || r.status === "awaiting_inspection")) return false;
        if (statusFilter === "urgent" && r.priority !== "urgent") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!r.id.includes(q) && !r.type.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      // Prioritize urgent/in_progress first, then room number
      const pOrder: Record<string, number> = { urgent: 0, high: 1, standard: 2, low: 3 };
      const pDiff = (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  }, [myRooms, allRooms, viewScope, activeFloor, statusFilter, searchQuery]);

  // Housekeeper metrics & estimated time
  const stats = useMemo(() => {
    const total = myRooms.length;
    const completed = myRooms.filter((r) => r.status === "clean" || r.status === "awaiting_inspection").length;
    const inProgress = myRooms.filter((r) => r.status === "in_progress").length;
    const remaining = total - completed;
    const urgent = myRooms.filter((r) => r.priority === "urgent" && r.status !== "clean").length;

    // Estimate: Turnover = ~40 mins, Stayover = ~25 mins
    const uncompletedRooms = myRooms.filter((r) => r.status !== "clean" && r.status !== "awaiting_inspection");
    const estMinutes = uncompletedRooms.reduce((acc, r) => acc + (r.serviceType === "turnover" ? 40 : 25), 0);
    const estHours = Math.floor(estMinutes / 60);
    const estRemMins = estMinutes % 60;
    const estTimeFormatted =
      estMinutes === 0
        ? "All caught up"
        : estHours > 0
        ? `~${estHours}h ${estRemMins > 0 ? `${estRemMins}m` : ""}`
        : `~${estRemMins}m`;

    return { total, completed, inProgress, remaining, urgent, estMinutes, estTimeFormatted };
  }, [myRooms]);

  const handleStartCleaning = async (room: RoomDoc) => {
    try {
      const res = await reliableFetch(`/api/suites/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_cleaning",
          attendant: selectedAttendant,
          userName: selectedAttendant,
        }),
      });
      const data = await res.json();
      if (res.status === 403 && data.reason === "notYours") {
        showToast(`Suite ${room.id} is assigned to ${data.attendant}. Ask a supervisor to reassign it.`);
        return;
      }
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
      case "not_logged":
        return { label: "Not logged", bg: "var(--bg-muted, #F1F5F9)", color: "var(--text-muted, #64748B)", border: "var(--border-default, #E2E8F0)" };
      default:
        return { label: status, bg: "var(--bg-muted, #F1F5F9)", color: "var(--text-secondary, #475569)", border: "var(--border-default, #E2E8F0)" };
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
        .hk-room-card {
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .hk-room-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md) !important;
        }
        @keyframes pulseHkLive {
          0% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(217, 119, 6, 0); }
          100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
        }
        .pulse-hk-inprog {
          animation: pulseHkLive 2s infinite;
        }
      `}</style>
      <NavigationHeader currentRole={currentRole} activeTab="housekeeper" />
      <ConnectionBanner />
      <HousekeeperAlerts rooms={allRooms} me={selectedAttendant} />

      {/* Photo banner */}
      <div style={{ maxWidth: 840, width: "100%", margin: "0 auto", padding: "16px 16px 0" }}>
        <PageBanner
          compact
          image={BANNERS.kitchen}
          focus="55%"
          eyebrow="Houston IAH Airport"
          title={`${selectedAttendant}'s suites`}
          subtitle={`${stats.completed} of ${stats.total} done today · Est. ${stats.estTimeFormatted} remaining`}
        />
      </div>

      {/* Housekeeper Hero / Shift Bar */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", padding: "16px 16px 12px" }}>
          {/* Staff Switcher & Shift Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--esa-brown)" }}>{staffName ? "My suites:" : "Housekeeper:"}</span>
              {staffName ? (
                <span style={{ padding: "6px 12px", borderRadius: 8, fontWeight: 700, fontSize: 14, backgroundColor: "var(--esa-brown-soft)", color: "var(--esa-brown)" }}>
                  {staffName}
                </span>
              ) : (
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
                {attendants.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              )}
            </div>

            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>Shift: 7:00 AM – 3:30 PM</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--st-clean)", display: "inline-block" }}></span>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Est. Work: {stats.estTimeFormatted}</span>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <PushToggle name={selectedAttendant} />
          </div>

          {/* Shift Metrics Grid */}
          <div className="hk-stats-grid">
            <div style={{ padding: "10px", borderRadius: 10, background: "var(--bg-muted)", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Assigned</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--esa-brown)" }}>{stats.total}</div>
            </div>
            <div style={{ padding: "10px", borderRadius: 10, background: "var(--st-clean-bg)", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--st-clean)", textTransform: "uppercase" }}>Done / Insp.</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--st-clean)" }}>{stats.completed}</div>
            </div>
            <div style={{ padding: "10px", borderRadius: 10, background: "var(--st-in-prog-bg)", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--st-in-prog)", textTransform: "uppercase" }}>Remaining</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--st-in-prog)" }}>{stats.remaining}</div>
            </div>
            <div style={{ padding: "10px", borderRadius: 10, background: stats.urgent > 0 ? "var(--st-dirty-bg)" : "var(--bg-muted)", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: stats.urgent > 0 ? "var(--st-dirty)" : "var(--text-muted)", textTransform: "uppercase" }}>Urgent</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: stats.urgent > 0 ? "var(--st-dirty)" : "var(--text-muted)" }}>{stats.urgent}</div>
            </div>
          </div>

          {/* Shift Completion Progress Bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>
                Shift Progress: {stats.completed} of {stats.total} suites complete · {stats.estTimeFormatted} left
              </span>
              <span style={{ fontWeight: 800, color: "var(--esa-green-dark)" }}>
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 7,
                backgroundColor: "var(--bg-muted)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`,
                  height: "100%",
                  backgroundColor: "var(--esa-green)",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
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
                    padding: "8px 12px",
                    minHeight: 36,
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    borderColor: activeFloor === fl ? "var(--color-primary)" : "var(--border-default)",
                    backgroundColor: activeFloor === fl ? "var(--color-primary)" : "#FFFFFF",
                    color: activeFloor === fl ? "#FFFFFF" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {fl === "all" ? "All" : `F${fl}`}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Quick Status Filters */}
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <input
                type="text"
                placeholder="Search room # or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  minHeight: 38,
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
              {[
                { key: "all", label: "All" },
                { key: "to_clean", label: "To Clean" },
                { key: "in_progress", label: "In Prog" },
                { key: "done", label: "Done" },
                { key: "urgent", label: "Urgent" },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key)}
                  style={{
                    padding: "7px 12px",
                    minHeight: 36,
                    borderRadius: "var(--radius-pill)",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    borderColor: statusFilter === st.key ? "var(--color-primary)" : "var(--border-default)",
                    backgroundColor: statusFilter === st.key ? "var(--color-primary)" : "#FFFFFF",
                    color: statusFilter === st.key ? "#FFFFFF" : "var(--text-secondary)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {st.label}
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
          viewScope === "assigned" && stats.total > 0 && stats.remaining === 0 ? (
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
                backgroundColor: "var(--bg-card, #FFFFFF)",
                borderRadius: 16,
                border: "2px solid var(--st-clean-border)",
                background: "linear-gradient(180deg, var(--st-clean-bg) 0%, var(--bg-card, #FFFFFF) 100%)",
                boxShadow: "var(--shadow-sm)",
                marginTop: 12,
              }}
            >
              <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", backgroundColor: "var(--st-clean-bg)", color: "var(--st-clean)", marginBottom: 12 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--st-clean)" }}>
                All {stats.total} Assigned Suites Complete!
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)", maxWidth: 460, marginInline: "auto" }}>
                Outstanding job, {selectedAttendant}! Every suite assigned to you today has been completed or submitted for supervisor inspection.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setViewScope("all")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "var(--esa-green)",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  View All Hotel Rooms ({allRooms.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setActiveFloor("all");
                    setSearchQuery("");
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "#FFFFFF",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1px solid var(--border-default)",
                    cursor: "pointer",
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          ) : (
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
              <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", backgroundColor: "var(--bg-muted)", color: "var(--text-muted)", marginBottom: 10 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--text-main)" }}>No Rooms Match Filters</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
                No suites match your current criteria on Floor {activeFloor === "all" ? "1-3" : activeFloor}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setActiveFloor("all");
                  setSearchQuery("");
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "var(--esa-brown)",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Reset All Filters
              </button>
            </div>
          )
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {displayedRooms.map((room) => {
              const st = getStatusBadge(room.status);
              const totalChecks = DEFAULT_CHECKLIST_TEMPLATE.length;
              const completedChecks = Object.values(room.checklist || {}).filter(Boolean).length;
              const checkPercent = Math.round((completedChecks / totalChecks) * 100);
              const isTurnover = room.serviceType === "turnover";
              const isUrgent = room.priority === "urgent";
              const isInProgress = room.status === "in_progress";

              return (
                <div
                  key={room.id}
                  className="hk-room-card"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 14,
                    border: isUrgent
                      ? "2px solid #F87171"
                      : isInProgress
                      ? "2px solid var(--st-in-prog)"
                      : "1px solid var(--border-default)",
                    padding: "16px",
                    boxShadow: "var(--shadow-xs)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {/* Top Bar: Room Number, Type & Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)", lineHeight: 1 }}>
                          Suite {room.id}
                        </span>
                        {/* Deadbolt Status Badge */}
                        {room.deadboltEngaged && (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "var(--radius-pill)",
                              backgroundColor: "#FEF2F2",
                              color: "#DC2626",
                              border: "1px solid #FECACA",
                              fontSize: 11,
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Guest privacy deadbolt is thrown from the inside thumbturn. Do not knock."
                          >
                            <span>🔒</span>
                            <span>Deadbolt (DND)</span>
                          </span>
                        )}
                        {/* Lock Battery Indicator */}
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: "var(--radius-pill)",
                            backgroundColor: (room.lockBattery ?? 92) <= 25 ? "#FEF2F2" : "var(--bg-muted)",
                            color: (room.lockBattery ?? 92) <= 25 ? "#DC2626" : "var(--text-secondary)",
                            border: `1px solid ${(room.lockBattery ?? 92) <= 25 ? "#FECACA" : "var(--border-default)"}`,
                            fontSize: 11,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          title={`Lock Battery: ${room.lockBattery ?? 92}% (4x AA Pack)`}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
                            <line x1="22" y1="11" x2="22" y2="13" />
                            <line x1="6" y1="11" x2="6" y2="13" stroke={(room.lockBattery ?? 92) <= 25 ? "#DC2626" : "#16A34A"} />
                            <line x1="10" y1="11" x2="10" y2="13" stroke={(room.lockBattery ?? 92) <= 25 ? "#DC2626" : "#16A34A"} />
                          </svg>
                          <span>{room.lockBattery ?? 92}%</span>
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
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: 4,
                            backgroundColor: "#F3F4F6",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          title={`Estimated service time: ${isTurnover ? "40 mins" : "25 mins"}`}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>{isTurnover ? "~40 min" : "~25 min"}</span>
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span>{room.type} · Floor {room.floor}</span>
                        {room.lastUnlockedAt && (
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            🔑 Last door access: {new Date(room.lastUnlockedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={isInProgress ? "pulse-hk-inprog" : ""}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "var(--radius-pill)",
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: st.bg,
                        color: st.color,
                        border: `1px solid ${st.border}`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {isInProgress && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "var(--st-in-prog)",
                            display: "inline-block",
                          }}
                        />
                      )}
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
                      {room.inspectionPhotoUrl && <div style={{ marginTop: 6 }}><PhotoThumb url={room.inspectionPhotoUrl} label="Photo from the inspection" /></div>}
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

                  {/* Prominent Operational Touch Actions */}
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>START CLEANING</span>
                      </button>
                    )}

                    {/* VIEW / RESUME CHECKLIST button */}
                    <button
                      type="button"
                      onClick={() => setChecklistRoom(room)}
                      style={{
                        flex: 1,
                        minWidth: 140,
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: isInProgress ? "none" : "1px solid var(--border-default)",
                        backgroundColor: isInProgress ? "var(--st-in-prog)" : "#FFFFFF",
                        color: isInProgress ? "#FFFFFF" : "var(--text-main)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        boxShadow: isInProgress ? "0 2px 8px rgba(217, 119, 6, 0.3)" : undefined,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      <span>{isInProgress ? `RESUME CHECKLIST (${completedChecks}/${totalChecks})` : "VIEW CHECKLIST"}</span>
                    </button>

                    {/* REPORT MAINTENANCE button */}
                    <button
                      type="button"
                      onClick={() => setMaintenanceRoom(room)}
                      style={{
                        padding: "12px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--st-dirty-border)",
                        backgroundColor: "var(--st-dirty-bg)",
                        color: "var(--st-dirty)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                      title="Report Maintenance Issue"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                      <span>Maintenance</span>
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
                        gap: 5,
                      }}
                      title="Request Supplies"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                      <span>Supplies</span>
                    </button>

                    {/* History button */}
                    <button
                      type="button"
                      onClick={() => setHistoryRoom(room)}
                      style={{
                        padding: "12px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border-default)",
                        backgroundColor: "#FFFFFF",
                        color: "var(--text-muted)",
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Room Log & History"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                      </svg>
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
          room={docs[historyRoom.id] ? toRoom(historyRoom.id, docs[historyRoom.id]) : historyRoom}
          onClose={() => setHistoryRoom(null)}
          canManage={["supervisor", "frontdesk", "admin"].includes(currentRole)}
          userName={selectedAttendant}
          onUpdated={handleRoomUpdated}
        />
      )}
    </div>
  );
}

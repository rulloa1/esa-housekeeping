"use client";

import { useState, useEffect, useMemo } from "react";
import { toRoom, toRooms } from "@/lib/roomView";
import type { RoomDoc, RoomStatus, Role } from "@/lib/models";
import { useAttendants } from "@/lib/useAttendants";
import { OverdueAlerts } from "./OverdueAlerts";
import { FrontDeskListModal } from "./FrontDeskListModal";
import { PushToggle } from "./PushToggle";
import { NavigationHeader } from "./NavigationHeader";
import { InspectionModal } from "./InspectionModal";
import { AssignmentModal } from "./AssignmentModal";
import { MaintenanceModal } from "./MaintenanceModal";
import { RoomHistoryDrawer } from "./RoomHistoryDrawer";
import { WorkloadDistribution } from "./WorkloadDistribution";
import { OperationsReportModal } from "./OperationsReportModal";
import { NotificationsDrawer } from "./NotificationsDrawer";

interface DashboardProps {
  initialDocs: Record<string, RoomDoc>;
  initialVersion: number;
  currentRole: Role;
}

export function SupervisorDashboard({ initialDocs, initialVersion, currentRole }: DashboardProps) {
  const [docs, setDocs] = useState<Record<string, RoomDoc>>(initialDocs);
  const [version, setVersion] = useState<number>(initialVersion);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [activeFloor, setActiveFloor] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [sortField, setSortField] = useState<"id" | "priority" | "status" | "updatedAt">("id");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Modals state
  const [inspectingRoom, setInspectingRoom] = useState<RoomDoc | null>(null);
  const [assigningRoom, setAssigningRoom] = useState<RoomDoc | null>(null);
  const [maintenanceRoom, setMaintenanceRoom] = useState<RoomDoc | null>(null);
  const [viewingHistoryRoom, setViewingHistoryRoom] = useState<RoomDoc | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Workload and batch assignment state
  const [activeAttendantFilter, setActiveAttendantFilter] = useState<string | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const attendants = useAttendants();
  const [batchAttendant, setBatchAttendant] = useState<string>(attendants[0]);
  // When the staff roster loads, pick its first housekeeper if the current pick isn't on it.
  useEffect(() => {
    setBatchAttendant((cur) => (cur === "Unassigned" || attendants.includes(cur) ? cur : attendants[0]));
  }, [attendants]);
  const [batchPriority, setBatchPriority] = useState<"urgent" | "high" | "standard" | "low">("standard");
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [showFrontDesk, setShowFrontDesk] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live polling every 3 seconds (15s if tab is hidden)
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

  const allRooms = useMemo(() => Object.values(toRooms(docs)), [docs]);

  // Operational metrics
  const metrics = useMemo(() => {
    const total = allRooms.length;
    const dirty = allRooms.filter((r) => r.status === "dirty").length;
    const assigned = allRooms.filter((r) => r.status === "assigned").length;
    const inProgress = allRooms.filter((r) => r.status === "in_progress").length;
    const awaitingInspection = allRooms.filter((r) => r.status === "awaiting_inspection").length;
    const inspectionFailed = allRooms.filter((r) => r.status === "inspection_failed").length;
    const clean = allRooms.filter((r) => r.status === "clean").length;
    const maintenance = allRooms.filter((r) => r.status === "maintenance" || (r.maintenanceIssues && r.maintenanceIssues.some((m) => m.status === "open"))).length;
    const ooo = allRooms.filter((r) => r.status === "ooo").length;
    const overdue = allRooms.filter((r) => (r.status === "dirty" || r.status === "in_progress") && r.priority === "urgent").length;

    return { total, dirty, assigned, inProgress, awaitingInspection, inspectionFailed, clean, maintenance, ooo, overdue };
  }, [allRooms]);

  // Floor Readiness Metrics
  const floorMetrics = useMemo(() => {
    return [1, 2, 3].map((fl) => {
      const rooms = allRooms.filter((r) => r.floor === fl);
      const total = rooms.length;
      const clean = rooms.filter((r) => r.status === "clean").length;
      const dirty = rooms.filter((r) => r.status === "dirty").length;
      const inProgress = rooms.filter((r) => r.status === "in_progress").length;
      const awaitingInspection = rooms.filter((r) => r.status === "awaiting_inspection").length;
      const percentage = total > 0 ? Math.round((clean / total) * 100) : 0;
      return { floor: fl, total, clean, dirty, inProgress, awaitingInspection, percentage };
    });
  }, [allRooms]);

  const handleExportCsv = () => {
    const rows = filteredRooms.map((r) => [
      `"${r.id}"`,
      r.floor,
      `"${r.type}"`,
      `"${r.status}"`,
      `"${r.priority}"`,
      `"${r.attendant || "Unassigned"}"`,
      `"${r.serviceType}"`,
      `"${r.inspectedBy || "Pending"}"`,
      `"${r.maintenanceIssues?.filter((m) => m.status === "open").length || 0}"`,
      `"${r.updatedAt || ""}"`,
    ]);

    const header = [
      "Suite",
      "Floor",
      "Room Type",
      "Status",
      "Priority",
      "Attendant",
      "Service Type",
      "Inspected By",
      "Open Maintenance",
      "Last Updated",
    ];
    const csvContent = [header.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", downloadUrl);
    link.setAttribute("download", `esa-iah-shift-roster-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredRooms.length} suites to CSV`);
  };

  const handleResetBaseline = async () => {
    if (!window.confirm("Reset all 96 suites to the morning baseline shift schedule? Any test updates made during this session will be reset.")) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch("/api/suites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_baseline" }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.docs) {
          setDocs(json.docs);
          setVersion(json.version);
        }
        showToast("Shift baseline restored: 96 suites reset to morning schedule.");
      } else {
        showToast("Error resetting demo baseline");
      }
    } catch {
      showToast("Network error resetting baseline");
    } finally {
      setIsResetting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/suites`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.docs) {
          setDocs(json.docs);
          setVersion(json.version);
        }
        showToast(`Dashboard updated: Live Sync v${json.version}`);
      }
    } catch {
      showToast("Sync error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtering & Sorting
  const filteredRooms = useMemo(() => {
    return allRooms.filter((room) => {
      // Floor filter
      if (activeFloor !== "all" && String(room.floor) !== activeFloor) return false;

      // Attendant filter (from Workload Distribution)
      if (activeAttendantFilter) {
        if (activeAttendantFilter === "Unassigned") {
          if (room.attendant) return false;
        } else if (room.attendant !== activeAttendantFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = room.id.includes(q);
        const matchAttendant = room.attendant?.toLowerCase().includes(q);
        const matchType = room.type.toLowerCase().includes(q);
        if (!matchId && !matchAttendant && !matchType) return false;
      }

      // Operational Quick Filters
      switch (activeFilter) {
        case "DIRTY":
          return room.status === "dirty";
        case "UNASSIGNED":
          return !room.attendant && (room.status === "dirty" || room.status === "assigned");
        case "ASSIGNED":
          return room.status === "assigned";
        case "IN PROGRESS":
          return room.status === "in_progress";
        case "AWAITING INSPECTION":
          return room.status === "awaiting_inspection";
        case "INSPECTION FAILED":
          return room.status === "inspection_failed";
        case "CLEAN AND INSPECTED":
          return room.status === "clean";
        case "MAINTENANCE REQUIRED":
          return room.status === "maintenance" || (room.maintenanceIssues && room.maintenanceIssues.length > 0);
        case "OUT OF SERVICE":
          return room.status === "ooo";
        case "NOT LOGGED":
          return room.status === "not_logged";
        case "OVERDUE":
          return (room.status === "dirty" || room.status === "in_progress") && room.priority === "urgent";
        default:
          return true;
      }
    }).sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") cmp = a.id.localeCompare(b.id, undefined, { numeric: true });
      else if (sortField === "priority") {
        const pOrder: Record<string, number> = { urgent: 0, high: 1, standard: 2, low: 3 };
        cmp = (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
      } else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      else if (sortField === "updatedAt") cmp = (b.updatedAt || "").localeCompare(a.updatedAt || "");
      return sortAsc ? cmp : -cmp;
    });
  }, [allRooms, activeFloor, activeAttendantFilter, searchQuery, activeFilter, sortField, sortAsc]);

  const handleRoomUpdated = (updated: RoomDoc) => {
    setDocs((prev) => ({ ...prev, [updated.id]: updated }));
  };

  // Workload composition breakdown for selected suites
  const selectedCounts = useMemo(() => {
    const selected = allRooms.filter((r) => selectedRoomIds.includes(r.id));
    const dirty = selected.filter((r) => r.status === "dirty").length;
    const turnover = selected.filter((r) => r.serviceType === "turnover").length;
    const stayover = selected.filter((r) => r.serviceType === "stayover").length;
    return { dirty, turnover, stayover };
  }, [allRooms, selectedRoomIds]);

  const handleBatchAssign = async () => {
    if (selectedRoomIds.length === 0) return;
    setIsSubmittingBatch(true);
    const count = selectedRoomIds.length;
    try {
      const res = await fetch("/api/suites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_assign",
          suiteIds: selectedRoomIds,
          attendant: batchAttendant === "Unassigned" ? null : batchAttendant,
          priority: batchPriority,
          userName: "Supervisor Sarah J.",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.docs) {
          setDocs(json.docs);
          setVersion(json.version);
        }
        showToast(`✓ Assigned ${count} suites to ${batchAttendant} (${batchPriority} priority)`);
        setSelectedRoomIds([]);
      }
    } catch (err) {
      console.error("Batch assignment error:", err);
      showToast("Failed to complete batch assignment");
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const selectAllFiltered = () => {
    if (selectedRoomIds.length === filteredRooms.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(filteredRooms.map((r) => r.id));
    }
  };

  const selectFloorRooms = (fl: number) => {
    const floorIds = allRooms.filter((r) => r.floor === fl).map((r) => r.id);
    setSelectedRoomIds((prev) => Array.from(new Set([...prev, ...floorIds])));
  };

  const selectUnassignedDirty = () => {
    const ids = allRooms
      .filter((r) => (r.status === "dirty" || r.status === "assigned") && !r.attendant)
      .map((r) => r.id);
    setSelectedRoomIds(ids);
  };


  const relativeTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case "dirty":
        return { label: "Dirty", bg: "var(--st-dirty-bg)", color: "var(--st-dirty)", border: "var(--st-dirty-border)" };
      case "assigned":
        return { label: "Assigned", bg: "var(--st-assigned-bg)", color: "var(--st-assigned)", border: "var(--st-assigned-border)" };
      case "in_progress":
        return { label: "In Progress", bg: "var(--st-in-prog-bg)", color: "var(--st-in-prog)", border: "var(--st-in-prog-border)" };
      case "awaiting_inspection":
        return { label: "Awaiting Inspection", bg: "var(--st-awaiting-insp-bg)", color: "var(--st-awaiting-insp)", border: "var(--st-awaiting-insp-border)" };
      case "inspection_failed":
        return { label: "Inspection Failed", bg: "var(--st-insp-fail-bg)", color: "var(--st-insp-fail)", border: "var(--st-insp-fail-border)" };
      case "clean":
        return { label: "Clean & Inspected", bg: "var(--st-clean-bg)", color: "var(--st-clean)", border: "var(--st-clean-border)" };
      case "maintenance":
        return { label: "Maintenance", bg: "var(--st-maint-bg)", color: "var(--st-maint)", border: "var(--st-maint-border)" };
      case "ooo":
        return { label: "Out of Service", bg: "var(--st-ooo-bg)", color: "var(--st-ooo)", border: "var(--st-ooo-border)" };
      case "not_logged":
        return { label: "Not logged", bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
      default:
        return { label: status, bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return { label: "Urgent", color: "#DC2626", bg: "#FEE2E2" };
      case "high":
        return { label: "High", color: "#D97706", bg: "#FEF3C7" };
      case "low":
        return { label: "Low", color: "#6B7280", bg: "#F3F4F6" };
      default:
        return { label: "Standard", color: "#4B5563", bg: "#F3F4F6" };
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F7F5F0",
        backgroundImage: "radial-gradient(ellipse at top left, rgba(47, 122, 30, 0.05) 0%, transparent 45%), radial-gradient(ellipse at top right, rgba(74, 55, 40, 0.06) 0%, transparent 45%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        .dash-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }
        /* Tablets: 8 tiles as two even rows of 4, no orphan tile. */
        @media (min-width: 641px) {
          .dash-kpi-grid { grid-template-columns: repeat(4, 1fr); }
        }
        /* Wide screens: all 8 tiles on one row. */
        @media (min-width: 1280px) {
          .dash-kpi-grid { grid-template-columns: repeat(8, 1fr); }
        }
        .dash-filters-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          align-items: center;
          padding-bottom: 4px;
        }
        .dash-filters-scroll::-webkit-scrollbar {
          display: none;
        }
        @keyframes slideUpBar {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to   { transform: translate(-50%, 0); opacity: 1; }
        }
        .dash-batch-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background-color: var(--esa-brown);
          color: #FFFFFF;
          border-radius: 14px;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          z-index: 900;
          max-width: 960px;
          width: calc(100% - 32px);
          flex-wrap: wrap;
          animation: slideUpBar 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes pulseDot {
          0% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.7; }
        }
        @keyframes slideInRow {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pulse-live {
          animation: pulseDot 2s infinite ease-in-out;
        }
        /* Glass-button hover — must be top-level, not inside a media query */
        .glass-btn {
          transition: background-color 0.15s ease, transform 0.15s ease;
        }
        .glass-btn:hover {
          background-color: rgba(255, 255, 255, 0.28) !important;
          transform: translateY(-1px);
        }
        /* KPI tile hover */
        .dash-kpi-btn {
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .dash-kpi-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1) !important;
        }
        /* Operations table row hover */
        .dash-ops-row {
          transition: background-color 0.12s ease;
        }
        .dash-ops-row:hover {
          background-color: rgba(47, 122, 30, 0.04) !important;
        }
        /* Narrow screens: hide Inspection and Updated-At columns */
        @media (max-width: 900px) {
          .dash-col-insp  { display: none; }
          .dash-col-updated { display: none; }
        }
        /* Mobile overrides */
        @media (max-width: 640px) {
          .dash-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .dash-batch-bar {
            bottom: 12px;
            padding: 10px 14px;
            gap: 10px;
          }
        }
        /* Print: hide controls, keep just the table */
        @media print {
          .dash-kpi-grid, .dash-filters-scroll, .dash-batch-bar,
          nav, header, button, input, select { display: none !important; }
          body { background: #fff !important; }
          table { font-size: 11px; }
        }
      `}</style>
      <NavigationHeader currentRole={currentRole} activeTab="supervisor" />

      <main style={{ maxWidth: 1320, width: "100%", margin: "0 auto", padding: "16px 12px 60px" }}>
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              top: 24,
              right: 24,
              backgroundColor: "var(--esa-brown-dark)",
              color: "#FFFFFF",
              padding: "12px 20px",
              borderRadius: "var(--radius-pill)",
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "var(--shadow-lg)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <span>🔔</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Signature Hotel Property Hero Banner */}
        <section
          style={{
            position: "relative",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 20,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.22), 0 8px 10px -6px rgba(0, 0, 0, 0.12)",
            backgroundImage: "linear-gradient(135deg, rgba(28, 24, 20, 0.94) 0%, rgba(46, 38, 32, 0.86) 48%, rgba(22, 26, 32, 0.92) 100%), url('/landing/hero-exterior-2752.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 35%",
            color: "#FFFFFF",
            padding: "24px 28px",
          }}
        >
          {/* Subtle Decorative Ambient Lighting */}
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 240,
              height: 240,
              background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.16)", backdropFilter: "blur(6px)", fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
                <span>★</span> Extended Stay America Suites · Houston IAH Airport
              </div>
              <h1 style={{ margin: "2px 0 6px", fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: "#FFFFFF", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
                Supervisor Operations Dashboard
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13, opacity: 0.94 }}>
                <span>🏢 96 Total Suites across 3 Floors</span>
                <span>•</span>
                <span>🌤️ Morning Shift (7:00 AM – 3:30 PM)</span>
                <span>•</span>
                <span>📍 1500 N Sam Houston Pkwy E</span>
              </div>
            </div>

            {/* Action Buttons with Glassmorphic Styling */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="glass-btn"
                onClick={handleExportCsv}
                title="Download shift roster as CSV"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span>📥</span> Export CSV
              </button>

              <button
                type="button"
                className="glass-btn"
                onClick={() => setShowReportModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span>📈</span> Operations Report
              </button>

              <button
                type="button"
                className="glass-btn"
                onClick={() => setShowNotifications(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span>🔔</span> Activity & Alerts
              </button>

              <button
                type="button"
                className="glass-btn"
                onClick={() => setShowFrontDesk(true)}
                title="Paste today's departures and arrivals"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span>🛎️</span> Departures & Arrivals
              </button>

              <button
                type="button"
                className="glass-btn"
                onClick={handleResetBaseline}
                disabled={isResetting}
                title="Reset all 96 suites to morning baseline shift state"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  backgroundColor: "rgba(239, 68, 68, 0.30)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(254, 202, 202, 0.45)",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isResetting ? "not-allowed" : "pointer",
                  opacity: isResetting ? 0.7 : 1,
                }}
              >
                <span>🔄</span> {isResetting ? "Resetting..." : "Reset Demo Shift"}
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 20,
                  backgroundColor: "rgba(0, 0, 0, 0.28)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  fontSize: 12,
                  color: "#FFFFFF",
                }}
              >
                <span>Live Sync v{version}</span>
                <span className="pulse-live" style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }}></span>
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  title="Force refresh now"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: "0 2px",
                    color: "#FFFFFF",
                  }}
                >
                  {isSyncing ? "⏳" : "⚡"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Operational Summary Cards (Phase 4) */}
        <section className="dash-kpi-grid">
          {[
            { key: "ALL", icon: "🏢", label: "Total Rooms", count: metrics.total, color: "var(--esa-brown)", bg: "#FFFFFF" },
            { key: "DIRTY", icon: "🧹", label: "Dirty Rooms", count: metrics.dirty, color: "var(--st-dirty)", bg: "#FEF2F2" },
            { key: "ASSIGNED", icon: "📋", label: "Assigned", count: metrics.assigned, color: "var(--st-assigned)", bg: "#EFF6FF" },
            { key: "IN PROGRESS", icon: "🧼", label: "Cleaning", count: metrics.inProgress, color: "var(--st-in-prog)", bg: "#FFFBEB" },
            { key: "AWAITING INSPECTION", icon: "🔍", label: "Awaiting Insp.", count: metrics.awaitingInspection, color: "var(--st-awaiting-insp)", bg: "#FAF5FF" },
            { key: "CLEAN AND INSPECTED", icon: "✨", label: "Clean & Ready", count: metrics.clean, color: "var(--st-clean)", bg: "#ECFDF5" },
            { key: "MAINTENANCE REQUIRED", icon: "🔧", label: "Maintenance", count: metrics.maintenance, color: "#DC2626", bg: "#FEF2F2" },
            { key: "OVERDUE", icon: "🚨", label: "Overdue / Urgent", count: metrics.overdue, color: "#B91C1C", bg: "#FEE2E2" },
          ].map((card) => {
            const isSelected = activeFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                className="dash-kpi-btn"
                onClick={() => setActiveFilter(card.key)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: isSelected ? `2px solid ${card.color}` : "1px solid var(--border-subtle)",
                  borderTop: `4px solid ${card.color}`,
                  backgroundColor: "#FFFFFF",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: isSelected ? "var(--shadow-md)" : "0 2px 6px rgba(0,0,0,0.03)",
                  display: "grid",
                  gap: 3,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    {card.label}
                  </span>
                  <span style={{ fontSize: 14 }}>{card.icon}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: card.color, lineHeight: 1.1 }}>
                  {card.count}
                </div>
                {isSelected && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: card.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    ● Active filter
                  </div>
                )}
              </button>
            );
          })}
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <PushToggle compact />
        </div>

        {/* Overdue: guest requests, checkouts not ready by check-in, waiting inspections */}
        <OverdueAlerts
          rooms={allRooms}
          onSelectSuite={(id) => setViewingHistoryRoom(allRooms.find((r) => r.id === id) ?? null)}
        />

        {/* Staff Workload & Assignment Distribution (Phase 10) */}
        <WorkloadDistribution
          rooms={allRooms}
          activeAttendantFilter={activeAttendantFilter}
          onSelectAttendant={setActiveAttendantFilter}
        />

        {/* Filter & Search Bar */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            border: "1px solid var(--border-default)",
            padding: "14px 16px",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxShadow: "var(--shadow-xs)",
          }}
        >
          {/* Quick Filters */}
          <div className="dash-filters-scroll">
            {/* The tiles above are the main filters; these are the extra ones they don't cover. */}
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginRight: 4, whiteSpace: "nowrap" }}>
              More filters
            </span>
            {[
              { key: "UNASSIGNED", label: "Unassigned", count: allRooms.filter((r) => !r.attendant && (r.status === "dirty" || r.status === "assigned")).length },
              { key: "INSPECTION FAILED", label: "Failed inspection", count: metrics.inspectionFailed },
              { key: "OUT OF SERVICE", label: "Out of service", count: metrics.ooo },
              { key: "NOT LOGGED", label: "Not logged", count: allRooms.filter((r) => r.status === "not_logged").length },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                style={{
                  padding: "5px 11px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid",
                  borderColor: activeFilter === f.key ? "var(--esa-green)" : "var(--border-default)",
                  backgroundColor: activeFilter === f.key ? "var(--esa-green-soft)" : "transparent",
                  color: activeFilter === f.key ? "var(--esa-green-dark)" : "var(--text-secondary)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {/* Search, Floor, and View Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, maxWidth: 500 }}>
              <input
                type="text"
                placeholder="Search by suite number, attendant, or room type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Floor Switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Floor:</span>
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
                    {fl === "all" ? "All Floors" : `Floor ${fl}`}
                  </button>
                ))}
              </div>

              {/* View Switcher: Table vs Cards */}
              <div style={{ display: "flex", border: "1px solid var(--border-default)", borderRadius: 8, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  style={{
                    padding: "6px 12px",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: viewMode === "table" ? "var(--esa-brown-soft)" : "#FFFFFF",
                    color: viewMode === "table" ? "var(--esa-brown)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  style={{
                    padding: "6px 12px",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: viewMode === "grid" ? "var(--esa-brown-soft)" : "#FFFFFF",
                    color: viewMode === "grid" ? "var(--esa-brown)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Room Cards
                </button>
              </div>

              {/* Print Morning Sheet Roster Button */}
              <button
                type="button"
                onClick={() => window.print()}
                className="glass-btn no-print"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  backgroundColor: "#FFFFFF",
                  color: "var(--esa-brown)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="Print morning assignment roster and room table"
              >
                <span>🖨️</span> Print Roster
              </button>
            </div>
          </div>
        </div>

        {/* Floor Progress & Clean Readiness Meters */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
              Floors ready
            </h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            {floorMetrics.map((fl) => {
              const isActive = activeFloor === String(fl.floor);
              return (
                <div
                  key={fl.floor}
                  onClick={() => setActiveFloor(isActive ? "all" : String(fl.floor))}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    border: isActive ? "2px solid var(--esa-green)" : "1px solid var(--border-default)",
                    padding: "12px 14px",
                    cursor: "pointer",
                    boxShadow: isActive ? "var(--shadow-md)" : "var(--shadow-xs)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--esa-brown)" }}>
                        Floor {fl.floor}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {fl.total} suites
                      </span>
                      {isActive && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: "var(--esa-green-soft)",
                            color: "var(--esa-green-dark)",
                            padding: "2px 6px",
                            borderRadius: 6,
                          }}
                        >
                          ACTIVE FILTER
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: fl.percentage >= 80 ? "var(--esa-green-dark)" : fl.percentage >= 50 ? "#D97706" : "var(--st-dirty)",
                      }}
                    >
                      {fl.percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      width: "100%",
                      height: 7,
                      backgroundColor: "var(--bg-muted)",
                      borderRadius: 4,
                      overflow: "hidden",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: `${fl.percentage}%`,
                        height: "100%",
                        backgroundColor: fl.percentage >= 80 ? "var(--esa-green)" : fl.percentage >= 50 ? "#F59E0B" : "var(--st-dirty)",
                        borderRadius: 4,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>

                  {/* Status counts breakdown */}
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-secondary)", flexWrap: "wrap" }}>
                    <span>{fl.dirty} dirty</span>
                    <span>{fl.inProgress} cleaning</span>
                    <span>{fl.awaitingInspection} to inspect</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results Info */}
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
          <span>Showing <strong>{filteredRooms.length}</strong> of {allRooms.length} suites</span>
          {activeFilter !== "ALL" && (
            <button
              onClick={() => setActiveFilter("ALL")}
              style={{ background: "none", border: "none", color: "var(--esa-green)", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* VIEW 1: OPERATIONS TABLE (Phase 4) */}
        {viewMode === "table" ? (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              border: "1px solid var(--border-default)",
              overflow: "hidden",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--esa-brown-soft)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ width: 40, padding: "12px 10px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={filteredRooms.length > 0 && selectedRoomIds.length === filteredRooms.length}
                        onChange={selectAllFiltered}
                        style={{ cursor: "pointer", width: 16, height: 16 }}
                        title="Select all filtered suites"
                      />
                    </th>
                    <th
                      style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)", cursor: "pointer" }}
                      onClick={() => { setSortField("id"); setSortAsc(!sortAsc); }}
                    >
                      Suite {sortField === "id" && (sortAsc ? "↑" : "↓")}
                    </th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Housekeeper</th>
                    <th
                      style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)", cursor: "pointer" }}
                      onClick={() => { setSortField("status"); setSortAsc(!sortAsc); }}
                    >
                      Status {sortField === "status" && (sortAsc ? "↑" : "↓")}
                    </th>
                    <th
                      style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)", cursor: "pointer" }}
                      onClick={() => { setSortField("priority"); setSortAsc(!sortAsc); }}
                    >
                      Priority {sortField === "priority" && (sortAsc ? "↑" : "↓")}
                    </th>
                    <th className="dash-col-insp" style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Inspection</th>
                    <th className="dash-col-updated" style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)", whiteSpace: "nowrap" }}>Updated</th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                        No suites match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((room) => {
                      const st = getStatusBadge(room.status);
                      const pr = getPriorityBadge(room.priority);
                      const hasOpenMaint = room.maintenanceIssues && room.maintenanceIssues.some((m) => m.status === "open");
                      const isRowSelected = selectedRoomIds.includes(room.id);

                      return (
                        <tr
                          key={room.id}
                          className="dash-ops-row"
                          style={{
                            borderBottom: "1px solid var(--border-subtle)",
                            backgroundColor: isRowSelected ? "rgba(47, 122, 30, 0.05)" : "transparent",
                          }}
                        >
                          {/* Checkbox */}
                          <td style={{ width: 40, padding: "12px 10px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedRoomIds((prev) => [...prev, room.id]);
                                else setSelectedRoomIds((prev) => prev.filter((id) => id !== room.id));
                              }}
                              style={{ cursor: "pointer", width: 16, height: 16 }}
                            />
                          </td>

                          {/* Room Number */}
                          <td style={{ padding: "12px 14px", fontWeight: 800, color: "var(--text-main)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 15 }}>{room.id}</span>
                              {hasOpenMaint && (
                                <span title="Open Maintenance Issue" style={{ color: "#DC2626", fontSize: 13 }}>⚠️</span>
                              )}
                            </div>
                            {/* Room type and service folded under the number to keep the table narrow */}
                            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {room.status === "not_logged" ? `Floor ${room.floor}` : `${room.type} · ${room.serviceType === "turnover" ? "Turnover" : "Stayover"}`}
                            </div>
                          </td>

                          {/* Attendant */}
                          <td style={{ padding: "12px 14px" }}>
                            {room.attendant ? (
                              <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{room.attendant}</div>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Unassigned</span>
                            )}
                          </td>

                          {/* Cleaning Status */}
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                padding: "4px 9px",
                                borderRadius: "var(--radius-pill)",
                                fontSize: 11,
                                fontWeight: 700,
                                backgroundColor: st.bg,
                                color: st.color,
                                border: `1px solid ${st.border}`,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {st.label}
                            </span>
                          </td>

                          {/* Priority */}
                          <td style={{ padding: "12px 14px" }}>
                            {pr.label === "Standard" ? (
                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                            ) : (
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  backgroundColor: pr.bg,
                                  color: pr.color,
                                }}
                              >
                                {pr.label}
                              </span>
                            )}
                          </td>

                          {/* Inspection QA (hidden on narrow screens; the status pill already says it) */}
                          <td className="dash-col-insp" style={{ padding: "12px 14px" }}>
                            {room.status === "awaiting_inspection" ? (
                              <span style={{ color: "var(--st-awaiting-insp)", fontWeight: 700, fontSize: 12 }}>
                                Ready
                              </span>
                            ) : room.status === "inspection_failed" ? (
                              <span style={{ color: "var(--st-insp-fail)", fontWeight: 700, fontSize: 12 }}>
                                Re-clean
                              </span>
                            ) : room.status === "clean" ? (
                              <span style={{ color: "var(--st-clean)", fontWeight: 600, fontSize: 12 }}>
                                ✓ Passed
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                            )}
                          </td>

                          {/* Last-updated relative timestamp */}
                          <td className="dash-col-updated" style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                            {room.updatedAt ? (
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }} title={room.updatedAt}>
                                {relativeTime(room.updatedAt)}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, whiteSpace: "nowrap" }}>
                              {/* Inspect button if awaiting inspection or failed */}
                              {(room.status === "awaiting_inspection" || room.status === "inspection_failed" || room.status === "in_progress") && (
                                <button
                                  type="button"
                                  onClick={() => setInspectingRoom(room)}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 6,
                                    border: "none",
                                    backgroundColor: "var(--st-awaiting-insp)",
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 700,
                                  }}
                                >
                                  Inspect
                                </button>
                              )}

                              {/* Assign button */}
                              <button
                                type="button"
                                onClick={() => setAssigningRoom(room)}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  border: "1px solid var(--border-default)",
                                  backgroundColor: "#FFFFFF",
                                  color: "var(--text-main)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Assign
                              </button>

                              {/* Maintenance button */}
                              <button
                                type="button"
                                onClick={() => setMaintenanceRoom(room)}
                                style={{
                                  padding: "5px 8px",
                                  borderRadius: 6,
                                  border: "1px solid var(--border-default)",
                                  backgroundColor: "#FFFFFF",
                                  color: "#DC2626",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                                title="Report Maintenance"
                              >
                                🔧
                              </button>

                              {/* Details button */}
                              <button
                                type="button"
                                onClick={() => setViewingHistoryRoom(room)}
                                style={{
                                  padding: "5px 8px",
                                  borderRadius: 6,
                                  border: "1px solid var(--border-default)",
                                  backgroundColor: "#FFFFFF",
                                  color: "var(--text-muted)",
                                  fontSize: 12,
                                }}
                                title="View History"
                              >
                                📋
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VIEW 2: VISUAL ROOM CARDS BOARD (Phase 5) */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {filteredRooms.map((room) => {
              const st = getStatusBadge(room.status);
              const pr = getPriorityBadge(room.priority);
              const hasOpenMaint = room.maintenanceIssues && room.maintenanceIssues.some((m) => m.status === "open");

              return (
                <div
                  key={room.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    border: "1px solid var(--border-default)",
                    padding: 14,
                    boxShadow: "var(--shadow-xs)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    {/* Card Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-main)", lineHeight: 1 }}>
                          Suite {room.id}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {room.type} · Floor {room.floor}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "3px 8px",
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

                    {/* Attendant & Priority */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, margin: "6px 0" }}>
                      <span style={{ color: "var(--text-muted)" }}>Attendant:</span>
                      <strong style={{ color: "var(--text-main)" }}>{room.attendant || "Unassigned"}</strong>
                      <span
                        style={{
                          marginLeft: "auto",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: pr.bg,
                          color: pr.color,
                        }}
                      >
                        {pr.label}
                      </span>
                    </div>

                    {/* Instructions / Alerts */}
                    {room.instructions && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#92400E",
                          backgroundColor: "#FFFBEB",
                          padding: "4px 8px",
                          borderRadius: 6,
                          marginTop: 6,
                        }}
                      >
                        {room.instructions}
                      </div>
                    )}

                    {hasOpenMaint && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#DC2626",
                          backgroundColor: "#FEF2F2",
                          padding: "4px 8px",
                          borderRadius: 6,
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        ⚠️ Open Maintenance Ticket
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: "flex", gap: 6, borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                    {(room.status === "awaiting_inspection" || room.status === "inspection_failed") && (
                      <button
                        type="button"
                        onClick={() => setInspectingRoom(room)}
                        style={{
                          flex: 1,
                          padding: "6px",
                          borderRadius: 6,
                          border: "none",
                          backgroundColor: "var(--st-awaiting-insp)",
                          color: "#FFFFFF",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Inspect
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAssigningRoom(room)}
                      style={{
                        flex: 1,
                        padding: "6px",
                        borderRadius: 6,
                        border: "1px solid var(--border-default)",
                        backgroundColor: "#FFFFFF",
                        color: "var(--text-main)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingHistoryRoom(room)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--border-default)",
                        backgroundColor: "#FFFFFF",
                        color: "var(--text-muted)",
                        fontSize: 12,
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Floating Batch Assignment Bar (Phase 10) */}
        {selectedRoomIds.length > 0 && (
          <div
            className="dash-batch-bar"
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "var(--esa-brown)",
              color: "#FFFFFF",
              borderRadius: 14,
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
              zIndex: 900,
              maxWidth: 960,
              width: "calc(100% - 32px)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  backgroundColor: "var(--esa-green)",
                  color: "#FFFFFF",
                  padding: "3px 9px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {selectedRoomIds.length}
              </span>
              <span>Suites Selected</span>
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 500 }}>
                ({selectedCounts.dirty} dirty · {selectedCounts.turnover} checkouts · {selectedCounts.stayover} refreshes)
              </span>
            </div>

            {/* Quick Floor & Filter Selectors */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, opacity: 0.8 }}>Add:</span>
              {[1, 2, 3].map((fl) => (
                <button
                  key={fl}
                  type="button"
                  onClick={() => selectFloorRooms(fl)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Fl {fl}
                </button>
              ))}
              <button
                type="button"
                onClick={selectUnassignedDirty}
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Unassigned Dirty
              </button>
            </div>

            {/* Batch Controls */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
              <select
                value={batchAttendant}
                onChange={(e) => setBatchAttendant(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: "#FFFFFF",
                  color: "var(--text-main)",
                  border: "none",
                }}
              >
                {attendants.map((att) => (
                  <option key={att} value={att}>{att}</option>
                ))}
                <option value="Unassigned">Unassigned</option>
              </select>

              <select
                value={batchPriority}
                onChange={(e) => setBatchPriority(e.target.value as any)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: "#FFFFFF",
                  color: "var(--text-main)",
                  border: "none",
                }}
              >
                <option value="standard">Standard Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
                <option value="low">Low Priority</option>
              </select>

              <button
                type="button"
                onClick={handleBatchAssign}
                disabled={isSubmittingBatch}
                style={{
                  padding: "7px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: "var(--esa-green)",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: isSubmittingBatch ? "not-allowed" : "pointer",
                }}
              >
                {isSubmittingBatch ? "Assigning..." : "Apply Batch Assignment"}
              </button>

              <button
                type="button"
                onClick={() => setSelectedRoomIds([])}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  backgroundColor: "transparent",
                  color: "rgba(255, 255, 255, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {inspectingRoom && (
        <InspectionModal
          room={inspectingRoom}
          onClose={() => setInspectingRoom(null)}
          onComplete={handleRoomUpdated}
        />
      )}

      {assigningRoom && (
        <AssignmentModal
          room={assigningRoom}
          onClose={() => setAssigningRoom(null)}
          onComplete={handleRoomUpdated}
        />
      )}

      {maintenanceRoom && (
        <MaintenanceModal
          room={maintenanceRoom}
          reportedByName="Supervisor Sarah J."
          onClose={() => setMaintenanceRoom(null)}
          onComplete={handleRoomUpdated}
        />
      )}

      {showFrontDesk && (
        <FrontDeskListModal
          onClose={() => setShowFrontDesk(false)}
          onApplied={(newDocs, newVersion, count) => {
            setDocs(newDocs);
            setVersion(newVersion);
            showToast(`Updated ${count} suite${count === 1 ? "" : "s"} from today's lists`);
          }}
        />
      )}

      {viewingHistoryRoom && (
        <RoomHistoryDrawer
          room={docs[viewingHistoryRoom.id] ? toRoom(viewingHistoryRoom.id, docs[viewingHistoryRoom.id]) : viewingHistoryRoom}
          onClose={() => setViewingHistoryRoom(null)}
          canManage={["supervisor", "frontdesk", "admin"].includes(currentRole)}
          userName={"Supervisor Sarah J."}
          onUpdated={handleRoomUpdated}
        />
      )}

      {/* Operations Report Modal (Phase 12) */}
      {showReportModal && (
        <OperationsReportModal
          rooms={allRooms}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Activity & Operational Alerts Center (Phase 12) */}
      {showNotifications && (
        <NotificationsDrawer
          rooms={allRooms}
          onClose={() => setShowNotifications(false)}
          onSelectRoom={(roomId) => setSearchQuery(roomId)}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            backgroundColor: "var(--esa-brown)",
            color: "#FFFFFF",
            padding: "12px 20px",
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            zIndex: 1100,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>✨</span> {toastMessage}
        </div>
      )}
    </div>
  );
}

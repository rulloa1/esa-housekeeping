"use client";

import { useState, useEffect, useMemo } from "react";
import { toRoom, toRooms } from "@/lib/roomView";
import type { RoomDoc, RoomStatus, Role } from "@/lib/models";
import { useAttendants } from "@/lib/useAttendants";
import { OverdueAlerts } from "./OverdueAlerts";
import { HandoverStrip } from "./Handover";
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
import { BRAND } from "@/lib/brand";

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
        case "DEADBOLT":
          return Boolean(room.deadboltEngaged);
        case "LOW BATTERY":
          return (room.lockBattery ?? 92) <= 25;
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
        return { label: "Not logged", bg: "var(--bg-muted, #F1F5F9)", color: "var(--text-muted, #64748B)", border: "var(--border-default, #E2E8F0)" };
      default:
        return { label: status, bg: "var(--bg-muted, #F1F5F9)", color: "var(--text-secondary, #475569)", border: "var(--border-default, #E2E8F0)" };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return { label: "Urgent", color: "var(--st-dirty, #DC2626)", bg: "var(--st-dirty-bg, #FEF2F2)" };
      case "high":
        return { label: "High", color: "var(--st-in-prog, #D97706)", bg: "var(--st-in-prog-bg, #FFFBEB)" };
      case "low":
        return { label: "Low", color: "var(--text-muted, #64748B)", bg: "var(--bg-muted, #F1F5F9)" };
      default:
        return { label: "Standard", color: "var(--text-secondary, #475569)", bg: "var(--bg-muted, #F1F5F9)" };
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
        /* Visual room card hover & micro-interaction */
        .dash-room-card {
          transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.15s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease;
        }
        .dash-room-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08) !important;
        }
        .dash-act-btn {
          transition: all 0.15s ease;
        }
        .dash-act-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
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
            backgroundImage: `linear-gradient(135deg, rgba(28, 24, 20, 0.92) 0%, rgba(46, 38, 32, 0.84) 48%, rgba(22, 26, 32, 0.90) 100%), url('${BRAND.photos?.hero || "/landing/hero-exterior-2752.jpg"}')`,
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {BRAND.name} · {BRAND.location}
              </div>
              <h1 style={{ margin: "2px 0 6px", fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: "#FFFFFF", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
                Supervisor Operations Dashboard
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13, opacity: 0.94 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="22" x2="9" y2="22.01" /><line x1="15" y1="22" x2="15" y2="22.01" /><line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" /><line x1="9" y1="10" x2="9" y2="10.01" /><line x1="15" y1="10" x2="15" y2="10.01" /><line x1="9" y1="14" x2="9" y2="14.01" /><line x1="15" y1="14" x2="15" y2="14.01" /><line x1="9" y1="18" x2="9" y2="18.01" /><line x1="15" y1="18" x2="15" y2="18.01" />
                  </svg>
                  {Object.keys(docs).length} Total Rooms across {BRAND.propertyLayout?.floors || 3} Floors
                </span>
                <span>•</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  Morning Shift (7:00 AM – 3:30 PM)
                </span>
                <span>•</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  {BRAND.address}
                </span>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                <span>Export CSV</span>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                <span>Operations Report</span>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                <span>Activity & Alerts</span>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>
                <span>Departures & Arrivals</span>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                <span>{isResetting ? "Resetting..." : "Reset Demo Shift"}</span>
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
                    padding: "0 2px",
                    color: "#FFFFFF",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Operational Summary Cards (KPIs) */}
        <section className="dash-kpi-grid">
          {[
            {
              key: "ALL",
              label: "Total Rooms",
              count: metrics.total,
              color: "var(--color-primary)",
              bg: "#FFFFFF",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              ),
            },
            {
              key: "DIRTY",
              label: "Dirty Rooms",
              count: metrics.dirty,
              color: "var(--st-dirty)",
              bg: "#FEF2F2",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ),
            },
            {
              key: "ASSIGNED",
              label: "Assigned",
              count: metrics.assigned,
              color: "var(--st-assigned)",
              bg: "#EFF6FF",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
              ),
            },
            {
              key: "IN PROGRESS",
              label: "Cleaning",
              count: metrics.inProgress,
              color: "var(--st-in-prog)",
              bg: "#FFFBEB",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              ),
            },
            {
              key: "AWAITING INSPECTION",
              label: "Awaiting Insp.",
              count: metrics.awaitingInspection,
              color: "var(--st-awaiting-insp)",
              bg: "#FAF5FF",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              ),
            },
            {
              key: "CLEAN AND INSPECTED",
              label: "Clean & Ready",
              count: metrics.clean,
              color: "var(--st-clean)",
              bg: "#ECFDF5",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ),
            },
            {
              key: "MAINTENANCE REQUIRED",
              label: "Maintenance",
              count: metrics.maintenance,
              color: "#DC2626",
              bg: "#FEF2F2",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              ),
            },
            {
              key: "OVERDUE",
              label: "Overdue / Urgent",
              count: metrics.overdue,
              color: "#B91C1C",
              bg: "#FEE2E2",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ),
            },
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
                  border: isSelected ? `2px solid ${card.color}` : "1px solid var(--border-default)",
                  borderTop: `4px solid ${card.color}`,
                  backgroundColor: "#FFFFFF",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: isSelected ? "var(--shadow-md)" : "0 2px 6px rgba(0,0,0,0.03)",
                  display: "grid",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {card.label}
                  </span>
                  <span style={{ color: card.color, display: "inline-flex", alignItems: "center" }}>{card.icon}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: card.color, lineHeight: 1.1, fontFamily: "var(--font-family)" }}>
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

        {/* Notes the previous shift left (app/handover) */}
        <HandoverStrip />

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
              { key: "DEADBOLT", label: "🔒 Deadbolt (DND)", count: allRooms.filter((r) => r.deadboltEngaged).length },
              { key: "LOW BATTERY", label: "🪫 Low Lock Battery", count: allRooms.filter((r) => (r.lockBattery ?? 92) <= 25).length },
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
            <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1, maxWidth: 500 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, color: "var(--text-muted)", pointerEvents: "none" }} aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by suite number, attendant, or room type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  fontSize: 13,
                  outline: "none",
                  backgroundColor: "#FFFFFF",
                  color: "var(--text-main)",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
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
                      transition: "all 0.15s ease",
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
                    padding: "8px 14px",
                    minHeight: 36,
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: viewMode === "table" ? "var(--color-muted)" : "#FFFFFF",
                    color: viewMode === "table" ? "var(--color-primary)" : "var(--text-muted)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  style={{
                    padding: "8px 14px",
                    minHeight: 36,
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: viewMode === "grid" ? "var(--color-muted)" : "#FFFFFF",
                    color: viewMode === "grid" ? "var(--color-primary)" : "var(--text-muted)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
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
                  color: "var(--text-main)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                title="Print morning assignment roster and room table"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
                <span>Print Roster</span>
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
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{room.id}</span>
                              {hasOpenMaint && (
                                <span title="Open Maintenance Issue" style={{ color: "#DC2626", display: "inline-flex", alignItems: "center" }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                  </svg>
                                </span>
                              )}
                              {room.deadboltEngaged && (
                                <span
                                  style={{
                                    padding: "1px 6px",
                                    borderRadius: "var(--radius-pill)",
                                    backgroundColor: "#FEF2F2",
                                    color: "#DC2626",
                                    border: "1px solid #FECACA",
                                    fontSize: 10,
                                    fontWeight: 800,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                  title="Guest privacy deadbolt engaged (DND)"
                                >
                                  <span>🔒</span>
                                  <span>DND</span>
                                </span>
                              )}
                              <span
                                style={{
                                  padding: "1px 5px",
                                  borderRadius: "var(--radius-pill)",
                                  backgroundColor: (room.lockBattery ?? 92) <= 25 ? "#FEF2F2" : "var(--bg-muted)",
                                  color: (room.lockBattery ?? 92) <= 25 ? "#DC2626" : "var(--text-secondary)",
                                  border: `1px solid ${(room.lockBattery ?? 92) <= 25 ? "#FECACA" : "var(--border-default)"}`,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                                title={`Electronic Lock Battery: ${room.lockBattery ?? 92}% (4x AA Alkaline Pack)`}
                              >
                                <span>{(room.lockBattery ?? 92) <= 25 ? "🪫" : "🔋"}</span>
                                <span>{room.lockBattery ?? 92}%</span>
                              </span>
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
                              <span style={{ color: "var(--st-clean)", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                                Passed
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
                                  className="dash-act-btn"
                                  onClick={() => setInspectingRoom(room)}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "5px 10px",
                                    borderRadius: 6,
                                    border: "none",
                                    backgroundColor: "var(--st-awaiting-insp)",
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                  <span>Inspect</span>
                                </button>
                              )}

                              {/* Assign button */}
                              <button
                                type="button"
                                className="dash-act-btn"
                                onClick={() => setAssigningRoom(room)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  border: "1px solid var(--border-default)",
                                  backgroundColor: "#FFFFFF",
                                  color: "var(--text-main)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                <span>Assign</span>
                              </button>

                              {/* Maintenance button */}
                              <button
                                type="button"
                                className="dash-act-btn"
                                onClick={() => setMaintenanceRoom(room)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "5px 8px",
                                  borderRadius: 6,
                                  border: "1px solid #FECACA",
                                  backgroundColor: "#FEF2F2",
                                  color: "#DC2626",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                title="Report Maintenance"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                              </button>

                              {/* Details button */}
                              <button
                                type="button"
                                className="dash-act-btn"
                                onClick={() => setViewingHistoryRoom(room)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "5px 8px",
                                  borderRadius: 6,
                                  border: "1px solid var(--border-default)",
                                  backgroundColor: "#FFFFFF",
                                  color: "var(--text-muted)",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                                title="View History & Logs"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
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
                  className="dash-room-card"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    border: "1px solid var(--border-default)",
                    borderLeft: `4px solid ${st.color}`,
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
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-main)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                            Suite {room.id}
                          </span>
                          {room.deadboltEngaged && (
                            <span
                              style={{
                                padding: "2px 7px",
                                borderRadius: "var(--radius-pill)",
                                backgroundColor: "#FEF2F2",
                                color: "#DC2626",
                                border: "1px solid #FECACA",
                                fontSize: 10,
                                fontWeight: 800,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                              title="Guest privacy deadbolt is thrown from the inside thumbturn (DND)"
                            >
                              <span>🔒</span>
                              <span>Deadbolt (DND)</span>
                            </span>
                          )}
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "var(--radius-pill)",
                              backgroundColor: (room.lockBattery ?? 92) <= 25 ? "#FEF2F2" : "var(--bg-muted)",
                              color: (room.lockBattery ?? 92) <= 25 ? "#DC2626" : "var(--text-secondary)",
                              border: `1px solid ${(room.lockBattery ?? 92) <= 25 ? "#FECACA" : "var(--border-default)"}`,
                              fontSize: 10,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                            title={`Lock Battery: ${room.lockBattery ?? 92}% (4x AA Pack)`}
                          >
                            <span>{(room.lockBattery ?? 92) <= 25 ? "🪫" : "🔋"}</span>
                            <span>{room.lockBattery ?? 92}%</span>
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
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
                          border: "1px solid #FECACA",
                          padding: "4px 8px",
                          borderRadius: 6,
                          marginTop: 4,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>Open Maintenance Ticket</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: "flex", gap: 6, borderTop: "1px solid var(--border-subtle)", paddingTop: 10, flexWrap: "wrap" }}>
                    {(room.status === "awaiting_inspection" || room.status === "inspection_failed") && (
                      <button
                        type="button"
                        className="dash-act-btn"
                        onClick={() => setInspectingRoom(room)}
                        style={{
                          flex: 1,
                          minWidth: 80,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          padding: "6px",
                          borderRadius: 6,
                          border: "none",
                          backgroundColor: "var(--st-awaiting-insp)",
                          color: "#FFFFFF",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>Inspect</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="dash-act-btn"
                      onClick={() => setAssigningRoom(room)}
                      style={{
                        flex: 1,
                        minWidth: 70,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        padding: "6px",
                        borderRadius: 6,
                        border: "1px solid var(--border-default)",
                        backgroundColor: "#FFFFFF",
                        color: "var(--text-main)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                      <span>Assign</span>
                    </button>
                    <button
                      type="button"
                      className="dash-act-btn"
                      onClick={() => setMaintenanceRoom(room)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid #FECACA",
                        backgroundColor: "#FEF2F2",
                        color: "#DC2626",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                      title="Report Maintenance Issue"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    </button>
                    <button
                      type="button"
                      className="dash-act-btn"
                      onClick={() => setViewingHistoryRoom(room)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--border-default)",
                        backgroundColor: "#FFFFFF",
                        color: "var(--text-muted)",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                      title="View Room History"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
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
              backgroundColor: "var(--color-primary)",
              color: "#FFFFFF",
              borderRadius: 14,
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "var(--shadow-xl)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              backdropFilter: "var(--glass-blur)",
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

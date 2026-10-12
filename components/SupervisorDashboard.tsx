"use client";

import { useState, useEffect, useMemo } from "react";
import type { RoomDoc, RoomStatus, Role } from "@/lib/models";
import { STAFF_ATTENDANTS } from "@/lib/models";
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
  const [batchAttendant, setBatchAttendant] = useState<string>(STAFF_ATTENDANTS[0]);
  const [batchPriority, setBatchPriority] = useState<"urgent" | "high" | "standard" | "low">("standard");
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);


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

  const allRooms = useMemo(() => Object.values(docs), [docs]);

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

  const handleBatchAssign = async () => {
    if (selectedRoomIds.length === 0) return;
    setIsSubmittingBatch(true);
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
        setSelectedRoomIds([]);
      }
    } catch (err) {
      console.error("Batch assignment error:", err);
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
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <NavigationHeader currentRole={currentRole} activeTab="supervisor" />

      <main style={{ maxWidth: 1320, width: "100%", margin: "0 auto", padding: "20px 16px 60px" }}>
        {/* Title & Property Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-main)", letterSpacing: -0.5 }}>
              Supervisor Operations Dashboard
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              Extended Stay America Suites · Houston IAH Airport (96 Total Suites across 3 Floors)
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--border-default)",
                color: "var(--text-main)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <span>📈</span> Operations Report
            </button>

            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--border-default)",
                color: "var(--text-main)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <span>🔔</span> Activity & Alerts
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Live Sync: Active (v{version})</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--st-clean)", display: "inline-block" }}></span>
            </div>
          </div>
        </div>

        {/* Operational Summary Cards (Phase 4) */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            { key: "ALL", label: "Total Rooms", count: metrics.total, color: "var(--esa-brown)", bg: "#FFFFFF" },
            { key: "DIRTY", label: "Dirty Rooms", count: metrics.dirty, color: "var(--st-dirty)", bg: "#FEF2F2" },
            { key: "ASSIGNED", label: "Assigned", count: metrics.assigned, color: "var(--st-assigned)", bg: "#EFF6FF" },
            { key: "IN PROGRESS", label: "Cleaning", count: metrics.inProgress, color: "var(--st-in-prog)", bg: "#FFFBEB" },
            { key: "AWAITING INSPECTION", label: "Awaiting Insp.", count: metrics.awaitingInspection, color: "var(--st-awaiting-insp)", bg: "#FAF5FF" },
            { key: "CLEAN AND INSPECTED", label: "Clean & Ready", count: metrics.clean, color: "var(--st-clean)", bg: "#ECFDF5" },
            { key: "MAINTENANCE REQUIRED", label: "Maintenance", count: metrics.maintenance, color: "#DC2626", bg: "#FEF2F2" },
            { key: "OVERDUE", label: "Overdue / Urgent", count: metrics.overdue, color: "#B91C1C", bg: "#FEE2E2" },
          ].map((card) => {
            const isSelected = activeFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveFilter(card.key)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: isSelected ? `2px solid ${card.color}` : "1px solid var(--border-subtle)",
                  backgroundColor: card.bg,
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-xs)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  display: "grid",
                  gap: 2,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: card.color, lineHeight: 1.1 }}>
                  {card.count}
                </div>
              </button>
            );
          })}
        </section>

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
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginRight: 4 }}>
              FILTER:
            </span>
            {[
              "ALL",
              "DIRTY",
              "UNASSIGNED",
              "ASSIGNED",
              "IN PROGRESS",
              "AWAITING INSPECTION",
              "INSPECTION FAILED",
              "CLEAN AND INSPECTED",
              "MAINTENANCE REQUIRED",
              "OUT OF SERVICE",
            ].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: "5px 11px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid",
                  borderColor: activeFilter === f ? "var(--esa-green)" : "var(--border-default)",
                  backgroundColor: activeFilter === f ? "var(--esa-green-soft)" : "transparent",
                  color: activeFilter === f ? "var(--esa-green-dark)" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {f}
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
            </div>
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
                      Room # {sortField === "id" && (sortAsc ? "↑" : "↓")}
                    </th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Room Type</th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Assigned Housekeeper</th>
                    <th
                      style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)", cursor: "pointer" }}
                      onClick={() => { setSortField("status"); setSortAsc(!sortAsc); }}
                    >
                      Cleaning Status {sortField === "status" && (sortAsc ? "↑" : "↓")}
                    </th>
                    <th
                      style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)", cursor: "pointer" }}
                      onClick={() => { setSortField("priority"); setSortAsc(!sortAsc); }}
                    >
                      Priority {sortField === "priority" && (sortAsc ? "↑" : "↓")}
                    </th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Service</th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Inspection QA</th>
                    <th style={{ padding: "12px 14px", fontWeight: 700, color: "var(--esa-brown)", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)" }}>
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
                          style={{
                            borderBottom: "1px solid var(--border-subtle)",
                            backgroundColor: isRowSelected ? "rgba(47, 122, 30, 0.05)" : "transparent",
                            transition: "background-color 0.15s ease",
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
                          </td>

                          {/* Room Type */}
                          <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>
                            <div>{room.type}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Floor {room.floor}</div>
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
                              }}
                            >
                              {st.label}
                            </span>
                          </td>

                          {/* Priority */}
                          <td style={{ padding: "12px 14px" }}>
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
                          </td>

                          {/* Service Type */}
                          <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: 12 }}>
                            {room.serviceType === "turnover" ? "Turnover" : "Stayover"}
                          </td>

                          {/* Inspection QA */}
                          <td style={{ padding: "12px 14px" }}>
                            {room.status === "awaiting_inspection" ? (
                              <span style={{ color: "var(--st-awaiting-insp)", fontWeight: 700, fontSize: 12 }}>
                                ⏱️ Ready for Insp.
                              </span>
                            ) : room.status === "inspection_failed" ? (
                              <span style={{ color: "var(--st-insp-fail)", fontWeight: 700, fontSize: 12 }}>
                                ✕ Needs Re-clean
                              </span>
                            ) : room.status === "clean" ? (
                              <span style={{ color: "var(--st-clean)", fontWeight: 600, fontSize: 12 }}>
                                ✓ Passed
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Pending Clean</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
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
            <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
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
                {STAFF_ATTENDANTS.map((att) => (
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

      {viewingHistoryRoom && (
        <RoomHistoryDrawer
          room={docs[viewingHistoryRoom.id] ?? viewingHistoryRoom}
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
    </div>
  );
}

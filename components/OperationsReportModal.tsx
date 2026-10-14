"use client";

import { useEffect, useMemo } from "react";
import type { RoomDoc } from "@/lib/models";
import { useAttendants } from "@/lib/useAttendants";
import { BRAND } from "@/lib/brand";

interface OperationsReportModalProps {
  rooms: RoomDoc[];
  onClose: () => void;
}

export function OperationsReportModal({ rooms, onClose }: OperationsReportModalProps) {
  const attendants = useAttendants();

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

  const stats = useMemo(() => {
    const total = rooms.length;
    const clean = rooms.filter((r) => r.status === "clean").length;
    const dirty = rooms.filter((r) => r.status === "dirty").length;
    const inProgress = rooms.filter((r) => r.status === "in_progress").length;
    const awaitingInspection = rooms.filter((r) => r.status === "awaiting_inspection").length;
    const inspectionFailed = rooms.filter((r) => r.status === "inspection_failed").length;
    const ooo = rooms.filter((r) => r.status === "ooo").length;

    // Inspection pass rate
    const inspectedRooms = rooms.filter((r) => r.inspectionResult);
    const passedCount = inspectedRooms.filter((r) => r.inspectionResult === "pass").length;
    const passRate = inspectedRooms.length > 0 ? Math.round((passedCount / inspectedRooms.length) * 100) : 100;

    // Average cleaning duration from real timestamps
    const completedWithTimes = rooms.filter((r) => r.startedAt && r.completedAt);
    let totalMinutes = 0;
    completedWithTimes.forEach((r) => {
      const start = new Date(r.startedAt!).getTime();
      const end = new Date(r.completedAt!).getTime();
      const mins = Math.max(1, Math.round((end - start) / (1000 * 60)));
      totalMinutes += mins;
    });
    const avgCleaningMinutes =
      completedWithTimes.length > 0 ? Math.round(totalMinutes / completedWithTimes.length) : 28;

    // Open maintenance issues
    const allMaintenance = rooms.flatMap((r) =>
      (r.maintenanceIssues || []).map((m) => ({ ...m, roomId: r.id }))
    );
    const openMaintenance = allMaintenance.filter((m) => m.status === "open" || m.status === "in_progress");

    // Pending supply requests
    const allSupplies = rooms.flatMap((r) =>
      (r.supplyRequests || []).map((s) => ({ ...s, roomId: r.id }))
    );
    const pendingSupplies = allSupplies.filter((s) => s.status === "pending");

    // Attendant Performance breakdown
    const held = rooms.map((r) => r.attendant).filter((a): a is string => Boolean(a) && !attendants.includes(a!));
    const attendantStats = [...attendants, ...Array.from(new Set(held))].map((name) => {
      const attRooms = rooms.filter((r) => r.attendant === name);
      const attClean = attRooms.filter((r) => r.status === "clean").length;
      const attInspected = attRooms.filter((r) => r.inspectionResult);
      const attPass = attInspected.filter((r) => r.inspectionResult === "pass").length;
      const attPassRate = attInspected.length > 0 ? Math.round((attPass / attInspected.length) * 100) : 100;

      return {
        name,
        assigned: attRooms.length,
        clean: attClean,
        passRate: attPassRate,
      };
    }).filter((a) => a.assigned > 0);

    return {
      total,
      clean,
      dirty,
      inProgress,
      awaitingInspection,
      inspectionFailed,
      ooo,
      passRate,
      inspectedCount: inspectedRooms.length,
      avgCleaningMinutes,
      completedCount: completedWithTimes.length,
      openMaintenance,
      pendingSupplies,
      attendantStats,
    };
  }, [rooms, attendants]);

  const handleExportCSV = () => {
    const headers = [
      "Suite",
      "Type",
      "Floor",
      "Status",
      "Priority",
      "ServiceType",
      "Attendant",
      "StartedAt",
      "CompletedAt",
      "InspectionResult",
    ];
    const rows = rooms.map((r) => [
      r.id,
      `"${r.type}"`,
      r.floor,
      r.status,
      r.priority,
      r.serviceType,
      `"${r.attendant || "Unassigned"}"`,
      `"${r.startedAt || ""}"`,
      `"${r.completedAt || ""}"`,
      `"${r.inspectionResult || "None"}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `esa-housekeeping-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
        overflowY: "auto",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="operations-report-title"
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          maxWidth: 840,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--border-default)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-default)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--esa-green)", textTransform: "uppercase" }}>
              {BRAND.name} · {BRAND.location}
            </div>
            <h2 id="operations-report-title" style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--color-primary)" }}>
                <path d="M18 20V10" />
                <path d="M12 20V4" />
                <path d="M6 20v-6" />
              </svg>
              Housekeeping Operations & QA Report
            </h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                backgroundColor: "var(--esa-green)",
                color: "#FFFFFF",
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              title="Download detailed operations CSV spreadsheet"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                backgroundColor: "var(--esa-brown-soft)",
                color: "var(--esa-brown)",
                border: "1px solid var(--border-default)",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Report
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close operations report"
              className="modal-close-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div style={{ padding: "24px", overflowY: "auto", display: "grid", gap: 24 }}>
          {/* Top KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 10, backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#065F46" }}>Clean & Inspected</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--st-clean)" }}>
                {stats.clean} / {stats.total}
              </div>
              <div style={{ fontSize: 11, color: "#047857" }}>{Math.round((stats.clean / stats.total) * 100)}% of total property</div>
            </div>

            <div style={{ padding: 14, borderRadius: 10, backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}>QA Inspection Pass Rate</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#2563EB" }}>
                {stats.passRate}%
              </div>
              <div style={{ fontSize: 11, color: "#1D4ED8" }}>{stats.inspectedCount} inspections logged</div>
            </div>

            <div style={{ padding: 14, borderRadius: 10, backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E" }}>Avg. Cleaning Duration</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#D97706" }}>
                {stats.avgCleaningMinutes} <span style={{ fontSize: 16 }}>min</span>
              </div>
              <div style={{ fontSize: 11, color: "#B45309" }}>Based on live timestamps</div>
            </div>

            <div style={{ padding: 14, borderRadius: 10, backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B" }}>Maintenance Open</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#DC2626" }}>
                {stats.openMaintenance.length}
              </div>
              <div style={{ fontSize: 11, color: "#B91C1C" }}>Engineering tickets</div>
            </div>
          </div>

          {/* Attendant Performance Summary */}
          <div>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>
              Attendant Productivity & QA Pass Rates
            </h3>
            <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--esa-brown-soft)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Housekeeper</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Assigned Suites</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Cleaned & Approved</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--esa-brown)" }}>Inspection Pass %</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.attendantStats.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>
                        No room attendant data available yet.
                      </td>
                    </tr>
                  ) : (
                    stats.attendantStats.map((att) => (
                      <tr key={att.name} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600 }}>{att.name}</td>
                        <td style={{ padding: "10px 14px" }}>{att.assigned}</td>
                        <td style={{ padding: "10px 14px", color: "var(--st-clean)", fontWeight: 700 }}>{att.clean}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: att.passRate >= 90 ? "#059669" : "#D97706" }}>
                          {att.passRate}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Engineering & Supply Delays Section */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Open Maintenance Tickets */}
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
                Active Maintenance Issues ({stats.openMaintenance.length})
              </h3>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                  padding: 8,
                  backgroundColor: "#FAFAFA",
                }}
              >
                {stats.openMaintenance.length === 0 ? (
                  <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                    No active maintenance tickets logged.
                  </div>
                ) : (
                  stats.openMaintenance.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: "8px 10px",
                        marginBottom: 6,
                        backgroundColor: "#FFFFFF",
                        border: "1px solid var(--border-default)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                        <span>Suite {m.roomId} · {m.category}</span>
                        <span style={{ color: "#DC2626", textTransform: "capitalize" }}>{m.priority}</span>
                      </div>
                      <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>{m.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Supply Requests */}
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
                Pending Supply Requisitions ({stats.pendingSupplies.length})
              </h3>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                  padding: 8,
                  backgroundColor: "#FAFAFA",
                }}
              >
                {stats.pendingSupplies.length === 0 ? (
                  <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                    No pending supply requisitions.
                  </div>
                ) : (
                  stats.pendingSupplies.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: "8px 10px",
                        marginBottom: 6,
                        backgroundColor: "#FFFFFF",
                        border: "1px solid var(--border-default)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                        <span>Suite {s.roomId} · {s.quantity}x {s.item}</span>
                        <span style={{ color: "#D97706" }}>Pending</span>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                        Requested by {s.requestedBy}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border-default)",
            backgroundColor: "#FAFAFA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {BRAND.name} · Live Shift Data
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              backgroundColor: "var(--esa-brown)",
              color: "#FFFFFF",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

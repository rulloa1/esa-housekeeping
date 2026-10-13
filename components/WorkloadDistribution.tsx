"use client";

import { useMemo, useState } from "react";
import type { RoomDoc } from "@/lib/models";
import { useAttendants } from "@/lib/useAttendants";

interface WorkloadDistributionProps {
  rooms: RoomDoc[];
  activeAttendantFilter: string | null;
  onSelectAttendant: (attendant: string | null) => void;
}

// Configurable standard cleaning duration estimates (minutes) by room type & service type
function estimateRoomMinutes(room: RoomDoc): number {
  let base = 30; // default Queen Studio
  if (room.type === "King Suite") base = 35;
  else if (room.type === "Double Queen") base = 40;
  else if (room.type === "Deluxe Studio") base = 45;

  if (room.serviceType === "stayover") {
    base = Math.round(base * 0.55);
  } else if (room.serviceType === "touchup") {
    base = Math.round(base * 0.35);
  }
  return base;
}

export function WorkloadDistribution({
  rooms,
  activeAttendantFilter,
  onSelectAttendant,
}: WorkloadDistributionProps) {
  // Collapsed by default so the dashboard stays uncluttered; opens itself
  // while a housekeeper filter is active.
  const [open, setOpen] = useState(false);
  const attendants = useAttendants();
  const attendantsData = useMemo(() => {
    // Roster names plus anyone still holding suites, so no assigned suite drops out of the counts.
    const held = rooms.map((r) => r.attendant).filter((a): a is string => Boolean(a) && !attendants.includes(a!));
    const list = [...attendants, ...Array.from(new Set(held)), "Unassigned"];

    return list.map((name) => {
      const isUnassigned = name === "Unassigned";
      const attendantRooms = rooms.filter((r) =>
        isUnassigned ? !r.attendant : r.attendant === name
      );

      const total = attendantRooms.length;
      const dirty = attendantRooms.filter((r) => r.status === "dirty").length;
      const inProgress = attendantRooms.filter((r) => r.status === "in_progress").length;
      const awaiting = attendantRooms.filter((r) => r.status === "awaiting_inspection").length;
      const clean = attendantRooms.filter((r) => r.status === "clean").length;
      const urgent = attendantRooms.filter((r) => r.priority === "urgent").length;

      const estimatedMinutes = attendantRooms.reduce(
        (sum, r) => (r.status === "clean" ? sum : sum + estimateRoomMinutes(r)),
        0
      );

      const completionPercent = total > 0 ? Math.round((clean / total) * 100) : 0;

      return {
        name,
        isUnassigned,
        total,
        dirty,
        inProgress,
        awaiting,
        clean,
        urgent,
        estimatedMinutes,
        completionPercent,
      };
    });
  }, [rooms, attendants]);

  // Detect workload imbalance among assigned staff
  const imbalanceAlert = useMemo(() => {
    const assignedStaff = attendantsData.filter(
      (a) => !a.isUnassigned && a.total > 0
    );
    if (assignedStaff.length < 2) return null;

    const sortedByRooms = [...assignedStaff].sort((a, b) => b.total - a.total);
    const maxStaff = sortedByRooms[0];
    const minStaff = sortedByRooms[sortedByRooms.length - 1];

    const roomDiff = maxStaff.total - minStaff.total;
    const minDiff = maxStaff.estimatedMinutes - minStaff.estimatedMinutes;

    if (roomDiff >= 4 || minDiff >= 120) {
      return {
        maxStaff: maxStaff.name,
        maxRooms: maxStaff.total,
        maxMinutes: maxStaff.estimatedMinutes,
        minStaff: minStaff.name,
        minRooms: minStaff.total,
        minMinutes: minStaff.estimatedMinutes,
        diff: roomDiff,
      };
    }
    return null;
  }, [attendantsData]);

  const isOpen = open || !!activeAttendantFilter;
  const staffOnShift = attendantsData.filter((a) => !a.isUnassigned && a.total > 0).length;
  // Same rule as the dashboard's "Unassigned" filter: suites that still need cleaning with no housekeeper.
  const unassignedCount = rooms.filter((r) => !r.attendant && (r.status === "dirty" || r.status === "assigned")).length;

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        padding: "16px 18px",
        marginBottom: 16,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: isOpen ? 12 : 0,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={isOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>Staff workload</h2>
          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {staffOnShift} on shift · {unassignedCount} to clean with no housekeeper
          </span>
          {imbalanceAlert && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#FEF3C7", color: "#92400E", whiteSpace: "nowrap" }}>
              Uneven
            </span>
          )}
          <span aria-hidden style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
            ▾
          </span>
        </button>

        {activeAttendantFilter && (
          <button
            type="button"
            onClick={() => onSelectAttendant(null)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--esa-brown-soft)",
              color: "var(--esa-brown)",
              border: "1px solid var(--border-default)",
              cursor: "pointer",
            }}
          >
            Clear Filter ({activeAttendantFilter}) ✕
          </button>
        )}
      </div>

      {/* Imbalance Alert Warning */}
      {isOpen && imbalanceAlert && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            backgroundColor: "#FFFBEB",
            border: "1px solid #FCD34D",
            color: "#92400E",
            fontSize: 13,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong>Workload Imbalance Warning:</strong> {imbalanceAlert.maxStaff} has{" "}
            {imbalanceAlert.maxRooms} rooms (~{Math.round(imbalanceAlert.maxMinutes / 60)}h remaining) while{" "}
            {imbalanceAlert.minStaff} has only {imbalanceAlert.minRooms} rooms (~
            {Math.round(imbalanceAlert.minMinutes / 60)}h). Consider reassigning suites to ensure balanced turnaround.
          </div>
        </div>
      )}

      {/* Attendants Grid */}
      {isOpen && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 10,
        }}
      >
        {attendantsData.map((att) => {
          const isSelected = activeAttendantFilter === att.name;
          const isUnassigned = att.isUnassigned;

          return (
            <button
              key={att.name}
              type="button"
              onClick={() => onSelectAttendant(isSelected ? null : att.name)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: 10,
                border: isSelected
                  ? "2px solid var(--esa-green)"
                  : "1px solid var(--border-default)",
                backgroundColor: isSelected
                  ? "var(--esa-green-soft)"
                  : isUnassigned && att.total > 0
                  ? "#FEF2F2"
                  : "#FAFAFA",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isUnassigned ? "#B91C1C" : "var(--text-main)",
                  }}
                >
                  {att.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: isUnassigned ? "#FEE2E2" : "#E5E7EB",
                    color: isUnassigned ? "#991B1B" : "#374151",
                  }}
                >
                  {att.total} {att.total === 1 ? "suite" : "suites"}
                </span>
              </div>

              {/* Progress & Duration Details */}
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>Clean: {att.clean}/{att.total}</span>
                <span>~{att.estimatedMinutes}m est.</span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 5,
                  width: "100%",
                  backgroundColor: "#E5E7EB",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${att.completionPercent}%`,
                    backgroundColor: "var(--st-clean)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              {att.urgent > 0 && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "#DC2626" }}>
                  🚨 {att.urgent} Urgent priority
                </div>
              )}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}

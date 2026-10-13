"use client";

import { useMemo, useState } from "react";
import { isGuestTask, type RoomDoc } from "@/lib/models";

interface NotificationsDrawerProps {
  rooms: RoomDoc[];
  onClose: () => void;
  onSelectRoom: (roomId: string) => void;
}

interface NotificationItem {
  id: string;
  roomId: string;
  category: "cleaning" | "inspection" | "maintenance" | "supply" | "guest" | "assignment";
  title: string;
  details: string;
  by: string;
  timestamp: string;
  isUrgent?: boolean;
}

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const TABS = [
  { key: "ALL", label: "All" },
  { key: "GUEST", label: "Guest" },
  { key: "INSPECTION", label: "Inspection" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "CLEANING", label: "Cleaning" },
] as const;

const getCategoryBadge = (cat: NotificationItem["category"]) => {
  switch (cat) {
    case "guest":
      return { label: "Guest Request", bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE", icon: "🛎️" };
    case "inspection":
      return { label: "Inspection QA", bg: "#FAF5FF", color: "#7E22CE", border: "#E9D5FF", icon: "🔍" };
    case "maintenance":
      return { label: "Maintenance", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA", icon: "🔧" };
    case "supply":
      return { label: "Supplies", bg: "#FFFBEB", color: "#B45309", border: "#FDE68A", icon: "📦" };
    case "assignment":
      return { label: "Assignment", bg: "#F3F4F6", color: "#374151", border: "#E5E7EB", icon: "📋" };
    default:
      return { label: "Cleaning", bg: "#ECFDF5", color: "#047857", border: "#A7F3D0", icon: "🧹" };
  }
};

export function NotificationsDrawer({
  rooms,
  onClose,
  onSelectRoom,
}: NotificationsDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // ── Rooms that need immediate action ─────────────────────────────────────
  const urgentRooms = useMemo(
    () =>
      rooms.filter(
        (r) =>
          r.status === "inspection_failed" ||
          (r.maintenanceIssues && r.maintenanceIssues.some((m) => m.status === "open"))
      ),
    [rooms]
  );

  // ── Full notification feed ────────────────────────────────────────────────
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];

    rooms.forEach((room) => {
      // From history log
      (room.history || []).forEach((hist) => {
        let category: NotificationItem["category"] = "cleaning";
        if (hist.event.toLowerCase().includes("inspection")) category = "inspection";
        else if (hist.event.toLowerCase().includes("maintenance")) category = "maintenance";
        else if (hist.event.toLowerCase().includes("supply")) category = "supply";
        else if (hist.event.toLowerCase().includes("assign")) category = "assignment";

        const isUrgent =
          category === "maintenance" ||
          (category === "inspection" && hist.event.toLowerCase().includes("fail"));

        list.push({
          id: hist.id,
          roomId: room.id,
          category,
          title: `Suite ${room.id} · ${hist.event}`,
          details: hist.details,
          by: hist.by,
          timestamp: hist.timestamp,
          isUrgent,
        });
      });

      // From guest requests
      const docAny = room as unknown as {
        guestRequests?: Array<{ type: string; at: string; doneAt?: string; doneBy?: string }>;
      };
      if (Array.isArray(docAny.guestRequests)) {
        docAny.guestRequests.forEach((gr, idx) => {
          list.push({
            id: `guest_${room.id}_${idx}_${gr.at}`,
            roomId: room.id,
            category: "guest",
            title: `Suite ${room.id} · Guest Request`,
            details: `Guest requested: ${gr.type.replace("_", " ")}${
              gr.doneAt ? ` · done by ${gr.doneBy}` : isGuestTask(gr.type) ? " · open" : ""
            }`,
            by: "Guest",
            timestamp: gr.at,
            isUrgent: !gr.doneAt && isGuestTask(gr.type),
          });
        });
      }
    });

    // Urgent items first, then newest first within each group
    return list.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [rooms]);

  // ── Per-tab counts for badges ─────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: notifications.length };
    TABS.forEach(({ key }) => {
      if (key !== "ALL") {
        counts[key] = notifications.filter((n) => n.category.toUpperCase() === key).length;
      }
    });
    return counts;
  }, [notifications]);

  const filtered = useMemo(() => {
    if (activeTab === "ALL") return notifications;
    return notifications.filter((n) => n.category.toUpperCase() === activeTab);
  }, [notifications, activeTab]);

  const urgentFiltered = filtered.filter((n) => n.isUrgent);
  const normalFiltered = filtered.filter((n) => !n.isUrgent);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(3px)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "#FFFFFF",
          height: "100%",
          boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.22)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-default)",
            background: "linear-gradient(135deg, var(--esa-brown-soft) 0%, #FFFFFF 100%)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2
                style={{
                  margin: "0 0 2px",
                  fontSize: 17,
                  fontWeight: 800,
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span>🔔</span> Activity & Alerts
                {urgentRooms.length > 0 && (
                  <span
                    style={{
                      backgroundColor: "#DC2626",
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-pill)",
                    }}
                  >
                    {urgentRooms.length} action needed
                  </span>
                )}
              </h2>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {notifications.length} events · {rooms.length} suites monitored
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#F3F4F6",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action-required pinned banner */}
        {activeTab === "ALL" && urgentRooms.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "#FEF2F2",
              borderBottom: "1px solid #FECACA",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: "#DC2626" }}>
              ⚠️ Action Required:
            </span>
            {urgentRooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelectRoom(r.id);
                  onClose();
                }}
                style={{
                  padding: "3px 9px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: "#FEE2E2",
                  color: "#B91C1C",
                  border: "1px solid #FECACA",
                  cursor: "pointer",
                }}
              >
                Suite {r.id}
                {r.status === "inspection_failed" ? " · Re-clean" : " · Maintenance"}
              </button>
            ))}
          </div>
        )}

        {/* Category filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 5,
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-subtle)",
            overflowX: "auto",
            backgroundColor: "#FAFAFA",
            scrollbarWidth: "none",
          }}
        >
          {TABS.map(({ key, label }) => {
            const count = tabCounts[key] ?? 0;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 11px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor: isActive ? "var(--esa-green)" : "var(--border-default)",
                  backgroundColor: isActive ? "var(--esa-green-soft)" : "#FFFFFF",
                  color: isActive ? "var(--esa-green-dark)" : "var(--text-secondary)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {label}
                {count > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      backgroundColor: isActive ? "var(--esa-green)" : "#E5E7EB",
                      color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                      padding: "1px 5px",
                      borderRadius: "var(--radius-pill)",
                      minWidth: 18,
                      textAlign: "center",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications feed */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)", fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              No events recorded in this category.
            </div>
          ) : (
            <>
              {urgentFiltered.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#DC2626",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginTop: 4,
                    }}
                  >
                    ⚡ Needs Attention
                  </div>
                  {urgentFiltered.map((item) => (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      onSelectRoom={onSelectRoom}
                      onClose={onClose}
                    />
                  ))}
                  {normalFiltered.length > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginTop: 8,
                      }}
                    >
                      Recent Activity
                    </div>
                  )}
                </>
              )}
              {normalFiltered.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  onSelectRoom={onSelectRoom}
                  onClose={onClose}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Individual notification card ──────────────────────────────────────────────
function NotificationCard({
  item,
  onSelectRoom,
  onClose,
}: {
  item: NotificationItem;
  onSelectRoom: (id: string) => void;
  onClose: () => void;
}) {
  const b = getCategoryBadge(item.category);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        onSelectRoom(item.roomId);
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectRoom(item.roomId);
          onClose();
        }
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: item.isUrgent ? `1.5px solid ${b.border}` : "1px solid var(--border-default)",
        backgroundColor: item.isUrgent ? b.bg : "#FFFFFF",
        cursor: "pointer",
        display: "grid",
        gap: 5,
        transition: "box-shadow 0.12s ease, transform 0.12s ease",
        outline: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 4,
            backgroundColor: b.bg,
            color: b.color,
            border: `1px solid ${b.border}`,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {b.icon} {b.label}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }} title={item.timestamp}>
          {relativeTime(item.timestamp)}
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>{item.title}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.details}</div>

      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>By: {item.by}</span>
        <span style={{ color: "var(--esa-green)", fontWeight: 600 }}>View suite →</span>
      </div>
    </div>
  );
}

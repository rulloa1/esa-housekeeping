"use client";

import { useEffect, useMemo, useState } from "react";
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
      return {
        label: "Guest Request",
        bg: "#EFF6FF",
        color: "#1D4ED8",
        border: "#BFDBFE",
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      };
    case "inspection":
      return {
        label: "Inspection QA",
        bg: "#FAF5FF",
        color: "#7E22CE",
        border: "#E9D5FF",
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        ),
      };
    case "maintenance":
      return {
        label: "Maintenance",
        bg: "#FEF2F2",
        color: "#DC2626",
        border: "#FECACA",
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        ),
      };
    case "supply":
      return {
        label: "Supplies",
        bg: "#FFFBEB",
        color: "#B45309",
        border: "#FDE68A",
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        ),
      };
    case "assignment":
      return {
        label: "Assignment",
        bg: "#F3F4F6",
        color: "#374151",
        border: "#E5E7EB",
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        ),
      };
    default:
      return {
        label: "Cleaning",
        bg: "#ECFDF5",
        color: "#047857",
        border: "#A7F3D0",
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ),
      };
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

  const urgentFiltered = filtered.filter((n) => n.isUrgent);
  const normalFiltered = filtered.filter((n) => !n.isUrgent);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-drawer-title"
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "#FFFFFF",
          height: "100%",
          boxShadow: "var(--shadow-xl)",
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
            background: "linear-gradient(135deg, var(--color-muted) 0%, #FFFFFF 100%)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2
                id="notifications-drawer-title"
                style={{
                  margin: "0 0 2px",
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--color-primary)" }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span>Activity & Alerts</span>
                {urgentRooms.length > 0 && (
                  <span
                    style={{
                      backgroundColor: "var(--st-dirty)",
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
              aria-label="Close activity notifications"
              className="modal-close-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action-required pinned banner */}
        {activeTab === "ALL" && urgentRooms.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "var(--st-dirty-bg)",
              borderBottom: "1px solid var(--st-dirty-border)",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--st-dirty)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Action Required:</span>
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
                  borderColor: isActive ? "var(--color-primary)" : "var(--border-default)",
                  backgroundColor: isActive ? "var(--color-primary)" : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "var(--text-secondary)",
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
                      backgroundColor: isActive ? "rgba(255, 255, 255, 0.25)" : "#E5E7EB",
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
              <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", backgroundColor: "var(--bg-muted)", color: "var(--text-muted)", marginBottom: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
              </div>
              <div>No events recorded in this category.</div>
            </div>
          ) : (
            <>
              {urgentFiltered.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--st-dirty)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>Needs Attention</span>
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

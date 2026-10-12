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
}

export function NotificationsDrawer({
  rooms,
  onClose,
  onSelectRoom,
}: NotificationsDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];

    rooms.forEach((room) => {
      // From history
      (room.history || []).forEach((hist) => {
        let category: NotificationItem["category"] = "cleaning";
        if (hist.event.toLowerCase().includes("inspection")) category = "inspection";
        else if (hist.event.toLowerCase().includes("maintenance")) category = "maintenance";
        else if (hist.event.toLowerCase().includes("supply")) category = "supply";
        else if (hist.event.toLowerCase().includes("assign")) category = "assignment";

        list.push({
          id: hist.id,
          roomId: room.id,
          category,
          title: `Suite ${room.id} · ${hist.event}`,
          details: hist.details,
          by: hist.by,
          timestamp: hist.timestamp,
        });
      });

      // From guest requests
      const docAny = room as unknown as { guestRequests?: Array<{ type: string; at: string; doneAt?: string; doneBy?: string }> };
      if (Array.isArray(docAny.guestRequests)) {
        docAny.guestRequests.forEach((gr, idx) => {
          list.push({
            id: `guest_${room.id}_${idx}_${gr.at}`,
            roomId: room.id,
            category: "guest",
            title: `Suite ${room.id} · Guest Request`,
            details: `Guest requested: ${gr.type.replace("_", " ")}${gr.doneAt ? ` · done by ${gr.doneBy}` : isGuestTask(gr.type) ? " · open" : ""}`,
            by: "Guest",
            timestamp: gr.at,
          });
        });
      }
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [rooms]);

  const filtered = useMemo(() => {
    if (activeTab === "ALL") return notifications;
    return notifications.filter((n) => n.category.toUpperCase() === activeTab);
  }, [notifications, activeTab]);

  const getCategoryBadge = (cat: NotificationItem["category"]) => {
    switch (cat) {
      case "guest":
        return { label: "Guest Request", bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" };
      case "inspection":
        return { label: "Inspection QA", bg: "#FAF5FF", color: "#7E22CE", border: "#E9D5FF" };
      case "maintenance":
        return { label: "Maintenance", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" };
      case "supply":
        return { label: "Supplies", bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" };
      case "assignment":
        return { label: "Assignment", bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
      default:
        return { label: "Cleaning", bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" };
    }
  };

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
          maxWidth: 460,
          backgroundColor: "#FFFFFF",
          height: "100%",
          boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.2)",
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔔</span> Activity & Operational Alerts
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {notifications.length} total operational events across property
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
            }}
          >
            ✕
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "10px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            overflowX: "auto",
            backgroundColor: "#FAFAFA",
          }}
        >
          {["ALL", "GUEST", "INSPECTION", "MAINTENANCE", "CLEANING"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-pill)",
                fontSize: 11,
                fontWeight: 700,
                border: "1px solid",
                borderColor: activeTab === tab ? "var(--esa-green)" : "var(--border-default)",
                backgroundColor: activeTab === tab ? "var(--esa-green-soft)" : "#FFFFFF",
                color: activeTab === tab ? "var(--esa-green-dark)" : "var(--text-secondary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "grid", gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-muted)", fontSize: 13 }}>
              No operational events recorded for this category.
            </div>
          ) : (
            filtered.map((item) => {
              const b = getCategoryBadge(item.category);
              const timeStr = new Date(item.timestamp).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectRoom(item.roomId);
                    onClose();
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--border-default)",
                    backgroundColor: "#FFFFFF",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "grid",
                    gap: 6,
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
                      }}
                    >
                      {b.label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeStr}</span>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
                    {item.title}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {item.details}
                  </div>

                  <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                    <span>By: {item.by}</span>
                    <span style={{ color: "var(--esa-green)", fontWeight: 600 }}>Click to view suite →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

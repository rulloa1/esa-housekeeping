"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/models";

interface HeaderProps {
  currentRole: Role | null;
  activeTab?: "supervisor" | "housekeeper" | "building3d";
}

export function NavigationHeader({ currentRole, activeTab }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header
      style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid var(--border-default)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img
              src="/esa-logo.png"
              alt="Extended Stay America"
              style={{ height: 38, objectFit: "contain", display: "block" }}
            />
          </Link>
          <div style={{ borderLeft: "1px solid var(--border-default)", paddingLeft: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--esa-brown)" }}>
              Houston IAH Airport
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>
              Housekeeping Operations
            </div>
          </div>
        </div>

        {/* View Switchers */}
        <nav style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              padding: "7px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: pathname === "/" ? "var(--esa-green)" : "transparent",
              color: pathname === "/" ? "#FFFFFF" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <span>📊</span> Supervisor Dashboard
          </Link>

          <Link
            href="/housekeeper"
            style={{
              padding: "7px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: pathname === "/housekeeper" ? "var(--esa-green)" : "transparent",
              color: pathname === "/housekeeper" ? "#FFFFFF" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <span>📱</span> Housekeeper View
          </Link>

          <Link
            href="/housekeeping"
            style={{
              padding: "7px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: pathname === "/housekeeping" ? "var(--esa-green)" : "transparent",
              color: pathname === "/housekeeping" ? "#FFFFFF" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <span>🏢</span> 3D Building Board
          </Link>
        </nav>

        {/* User Info & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-pill)",
              background: "var(--esa-brown-soft)",
              color: "var(--esa-brown)",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--esa-green)", display: "inline-block" }}></span>
            Role: {currentRole ? (currentRole === "housekeeper" || currentRole === "housekeeping" ? "Housekeeper" : "Supervisor") : "Staff"}
          </div>

          <form method="post" action="/api/logout" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                background: "#FFFFFF",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              title="Sign out of current shift"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

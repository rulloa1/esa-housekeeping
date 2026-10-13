"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/models";

interface HeaderProps {
  currentRole: Role | null;
  activeTab?: "supervisor" | "housekeeper" | "building3d";
}

export function NavigationHeader({ currentRole }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Supervisor Dashboard", icon: "📊" },
    { href: "/housekeeper", label: "Housekeeper View", icon: "📱" },
    { href: "/housekeeping", label: "3D Building Board", icon: "🏢" },
    { href: "/guest-links", label: "Guest QR Cards", icon: "🖨️" },
    { href: "/staff", label: "Staff Portal", icon: "🏠" },
    ...(currentRole === "admin" ? [{ href: "/roster", label: "Staff Roster", icon: "👥" }] : []),
  ];

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
      <style>{`
        .nav-desktop-links {
          display: flex;
          align-items: center;
          gap: 6;
        }
        .nav-mobile-toggle {
          display: none;
        }
        .nav-pills-scroll {
          display: none;
        }
        /* iPad landscape (901-1279px): drop the emoji and tighten the links so
           the five tabs stay on one line next to the role badge. */
        @media (min-width: 901px) and (max-width: 1279px) {
          .nav-desktop-links a {
            padding: 7px 9px !important;
            font-size: 12.5px !important;
          }
          .nav-link-icon {
            display: none;
          }
        }
        @media (max-width: 900px) {
          .nav-desktop-links {
            display: none;
          }
          .nav-mobile-toggle {
            display: flex;
          }
          .nav-pills-scroll {
            display: flex;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            gap: 8px;
            padding: 8px 16px;
            border-top: 1px solid var(--border-subtle);
            background: #FAFAFA;
          }
          .nav-pills-scroll::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>

      {/* Main Top Header Bar */}
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
            <img
              src="/esa-logo.png"
              alt="Extended Stay America"
              style={{ height: 34, objectFit: "contain", display: "block" }}
            />
          </Link>
          <div style={{ borderLeft: "1px solid var(--border-default)", paddingLeft: 10, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--esa-brown)", whiteSpace: "nowrap" }}>
              Houston IAH
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Housekeeping
            </div>
          </div>
        </div>

        {/* Desktop View Switchers */}
        <nav className="nav-desktop-links" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "7px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  background: isActive ? "var(--esa-green)" : "transparent",
                  color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                <span className="nav-link-icon">{link.icon}</span> {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Role Badge + Mobile Toggle & Sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-pill)",
              background: "var(--esa-brown-soft)",
              color: "var(--esa-brown)",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--esa-green)", display: "inline-block" }}></span>
            {currentRole ? (currentRole === "housekeeper" || currentRole === "housekeeping" ? "Housekeeper" : "Supervisor") : "Staff"}
          </div>

          <form method="post" action="/api/logout" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                background: "#FFFFFF",
                color: "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Sign out of shift"
            >
              Sign out
            </button>
          </form>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            className="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              backgroundColor: mobileMenuOpen ? "var(--esa-brown-soft)" : "#FFFFFF",
              color: "var(--text-main)",
              fontSize: 16,
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Quick-Pill Navigation */}
      <nav className="nav-pills-scroll" aria-label="Mobile Quick Navigation">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                whiteSpace: "nowrap",
                background: isActive ? "var(--esa-green)" : "#FFFFFF",
                color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                border: isActive ? "1px solid var(--esa-green)" : "1px solid var(--border-default)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <span>{link.icon}</span> {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid var(--border-default)",
            padding: "12px 16px 16px",
            display: "grid",
            gap: 8,
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            Hotel Station Views
          </div>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: isActive ? "var(--esa-green)" : "var(--bg-muted)",
                  color: isActive ? "#FFFFFF" : "var(--text-main)",
                }}
              >
                <span style={{ fontSize: 18 }}>{link.icon}</span>
                <span>{link.label}</span>
                {isActive && <span style={{ marginLeft: "auto", fontSize: 12 }}>● Active</span>}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

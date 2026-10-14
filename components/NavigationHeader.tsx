"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/models";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "./BrandLogo";
import { HotelSwitcherModal } from "./HotelSwitcherModal";

interface HeaderProps {
  currentRole: Role | null;
  activeTab?: "supervisor" | "housekeeper" | "building3d";
}

export function NavigationHeader({ currentRole }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setToolsDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Primary navigation tabs
  const primaryLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      href: "/housekeeper",
      label: "Housekeeper",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      ),
    },
    {
      href: "/housekeeping",
      label: "3D Board",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
  ];

  // Secondary tools & operations
  const toolLinks = [
    {
      href: "/handover",
      label: "Handover Log",
      description: "Daily shift logs & guest notes",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      href: "/lost-found",
      label: "Lost & Found",
      description: "Guest left-behind inventory",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      href: "/guest-links",
      label: "Guest QR Cards",
      description: "Printable room QR codes",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      href: "/staff",
      label: "Staff Portal",
      description: "Staff overview & links",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    ...(currentRole && currentRole !== "housekeeper" && currentRole !== "housekeeping"
      ? [
          {
            href: "/reports",
            label: "Operations Reports",
            description: "Analytics & export summaries",
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
              </svg>
            ),
          },
        ]
      : []),
    ...(currentRole === "admin"
      ? [
          {
            href: "/roster",
            label: "Staff Roster",
            description: "Assign teams & floor leads",
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  const allNavLinks = [...primaryLinks, ...toolLinks];
  const isToolActive = toolLinks.some((link) => pathname === link.href);

  return (
    <header
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        borderBottom: "1px solid var(--border-default)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <style>{`
        .nav-desktop-container {
          display: flex;
          align-items: center;
          background: rgba(241, 245, 249, 0.7);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          padding: 3px;
          gap: 3px;
        }
        .nav-item-btn {
          padding: 6px 12px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.15s ease;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .nav-item-btn:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.6);
        }
        .nav-item-btn.active {
          background: var(--color-primary);
          color: #FFFFFF;
          box-shadow: 0 1px 3px rgba(30, 58, 138, 0.25);
        }
        .nav-item-btn:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
        .dropdown-menu-card {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 270px;
          background: #FFFFFF;
          border: 1px solid var(--border-default);
          border-radius: 12px;
          box-shadow: var(--shadow-lg);
          padding: 6px;
          display: grid;
          gap: 2px;
          z-index: 120;
          animation: slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dropdown-link-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          text-decoration: none;
          color: var(--text-main);
          transition: background 0.15s ease;
        }
        .dropdown-link-item:hover {
          background: var(--bg-muted);
        }
        .dropdown-link-item.active {
          background: rgba(30, 58, 138, 0.08);
          color: var(--color-primary);
        }
        .nav-mobile-toggle {
          display: none;
        }
        .nav-pills-scroll {
          display: none;
        }
        @media (max-width: 960px) {
          .nav-desktop-container {
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
            gap: 6px;
            padding: 8px 14px;
            border-top: 1px solid var(--border-subtle);
            background: rgba(248, 250, 252, 0.95);
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
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
            <BrandLogo height={32} />
          </Link>
          <div style={{ borderLeft: "1px solid var(--border-default)", paddingLeft: 10, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--esa-brown)", whiteSpace: "nowrap" }}>
              {BRAND.location}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap" }}>
              {BRAND.department}
            </div>
          </div>
        </div>

        {/* Desktop Simplified Navigation */}
        <nav className="nav-desktop-container" aria-label="Main Navigation">
          {primaryLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-item-btn ${isActive ? "active" : ""}`}
              >
                <span style={{ display: "inline-flex", alignItems: "center" }}>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}

          {/* Tools & Operations Popover Menu */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              className={`nav-item-btn ${isToolActive ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              aria-expanded={toolsDropdownOpen}
              aria-haspopup="true"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Operations</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: toolsDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {toolsDropdownOpen && (
              <div className="dropdown-menu-card" role="menu">
                <div style={{ padding: "6px 10px 4px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Operations & Tools
                </div>
                {toolLinks.map((tool) => {
                  const isActive = pathname === tool.href;
                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      role="menuitem"
                      onClick={() => setToolsDropdownOpen(false)}
                      className={`dropdown-link-item ${isActive ? "active" : ""}`}
                    >
                      <span style={{ display: "inline-flex", marginTop: 2, color: isActive ? "var(--color-primary)" : "var(--text-secondary)" }}>
                        {tool.icon}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{tool.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{tool.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right Section: Hotel Switcher + Role Badge + Mobile Toggle & Sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setHotelModalOpen(true)}
            title="Switch or customize hotel property"
            style={{
              padding: "5px 12px",
              minHeight: 36,
              borderRadius: "var(--radius-pill)",
              background: "rgba(30, 58, 138, 0.08)",
              border: "1px solid var(--border-default)",
              color: "var(--color-primary)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: 13 }}>🏨</span>
            <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {BRAND.shortName}
            </span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
          </button>

          <div
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-pill)",
              background: "var(--color-muted)",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid var(--border-default)",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--st-clean)", display: "inline-block" }}></span>
            {currentRole ? (currentRole === "housekeeper" || currentRole === "housekeeping" ? "Housekeeper" : "Supervisor") : "Staff"}
          </div>

          <form method="post" action="/api/logout" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                padding: "8px 14px",
                minHeight: 38,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                background: "var(--bg-card, #FFFFFF)",
                color: "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
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
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              backgroundColor: mobileMenuOpen ? "var(--color-muted)" : "var(--bg-card, #FFFFFF)",
              color: "var(--text-main)",
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Quick-Pill Navigation */}
      <nav className="nav-pills-scroll" aria-label="Mobile Quick Navigation">
        {allNavLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "6px 12px",
                minHeight: 34,
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                background: isActive ? "var(--color-primary)" : "#FFFFFF",
                color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                border: isActive ? "1px solid var(--color-primary)" : "1px solid var(--border-default)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center" }}>{link.icon}</span>
              <span>{link.label}</span>
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
            padding: "14px 16px 20px",
            display: "grid",
            gap: 12,
            boxShadow: "var(--shadow-lg)",
            animation: "slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
              Core Operations
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {primaryLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      padding: "10px 14px",
                      minHeight: 44,
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: isActive ? "var(--color-primary)" : "var(--bg-muted)",
                      color: isActive ? "#FFFFFF" : "var(--text-main)",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center" }}>{link.icon}</span>
                    <span>{link.label}</span>
                    {isActive && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, opacity: 0.9 }}>Active</span>}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
              Tools & Management
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {toolLinks.map((tool) => {
                const isActive = pathname === tool.href;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      padding: "10px 14px",
                      minHeight: 44,
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: isActive ? "var(--color-primary)" : "var(--bg-muted)",
                      color: isActive ? "#FFFFFF" : "var(--text-main)",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center" }}>{tool.icon}</span>
                    <div>
                      <div>{tool.label}</div>
                      <div style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.8)" : "var(--text-muted)" }}>{tool.description}</div>
                    </div>
                    {isActive && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, opacity: 0.9 }}>Active</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hotel Property Template Switcher Modal */}
      <HotelSwitcherModal
        isOpen={hotelModalOpen}
        onClose={() => setHotelModalOpen(false)}
      />
    </header>
  );
}

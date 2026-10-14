"use client";

import { useState } from "react";

interface LoginFormProps {
  roles: Record<string, string>;
  signInText: string;
  roleText: string;
  pinText: string;
  pinPlaceholder: string;
  errorMessage?: string;
}

const field = {
  padding: "12px 14px",
  fontSize: "15px",
  borderRadius: "8px",
  border: "1px solid var(--border-default)",
  background: "var(--bg-card, #FFFFFF)",
  color: "var(--text-main, #0F172A)",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};

export function LoginForm({
  roles,
  signInText,
  roleText,
  pinText,
  pinPlaceholder,
  errorMessage,
}: LoginFormProps) {
  const [selectedRole, setSelectedRole] = useState("supervisor");
  const [pin, setPin] = useState("1234");

  const setCredentials = (r: string, p: string) => {
    setSelectedRole(r);
    setPin(p);
  };

  return (
    <form method="post" action="/api/login" style={{ display: "grid", gap: 14 }}>
      {/* Quick Demo Pre-Fill Chips for Seamless Presentation */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>
          Quick Demo Login
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => setCredentials("supervisor", "1234")}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: selectedRole === "supervisor" ? "2px solid var(--color-primary)" : "1px solid var(--border-default)",
              background: selectedRole === "supervisor" ? "rgba(30, 58, 138, 0.08)" : "var(--bg-card, #FFFFFF)",
              color: selectedRole === "supervisor" ? "var(--color-primary)" : "var(--text-main)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
            <div>
              <div style={{ fontWeight: 700 }}>Supervisor</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)" }}>PIN: 1234</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCredentials("housekeeper", "1234")}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: selectedRole === "housekeeper" ? "2px solid var(--color-primary)" : "1px solid var(--border-default)",
              background: selectedRole === "housekeeper" ? "rgba(30, 58, 138, 0.08)" : "var(--bg-card, #FFFFFF)",
              color: selectedRole === "housekeeper" ? "var(--color-primary)" : "var(--text-main)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2v4" />
              <path d="m4.93 10.93 2.83-2.83" />
              <path d="M2 18h4" />
              <path d="M20 18h2" />
              <path d="m19.07 10.93-2.83-2.83" />
              <polygon points="12 6 9 14 15 14 12 6" />
              <line x1="8" y1="21" x2="16" y2="21" />
            </svg>
            <div>
              <div style={{ fontWeight: 700 }}>Housekeeper</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)" }}>PIN: 1234</div>
            </div>
          </button>
        </div>
      </div>

      <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13, color: "var(--text-secondary)" }}>
        {roleText}
        <select
          name="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          style={field}
        >
          {Object.entries(roles).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13, color: "var(--text-secondary)" }}>
        {pinText}
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder={pinPlaceholder}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
          style={field}
        />
      </label>

      {errorMessage && (
        <div role="alert" style={{ padding: "10px 12px", borderRadius: 8, background: "var(--st-dirty-bg)", border: "1px solid var(--st-dirty-border)", color: "var(--st-dirty)", fontSize: 13, fontWeight: 600 }}>
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        style={{
          padding: "13px 16px",
          fontSize: 15,
          fontWeight: 700,
          borderRadius: 8,
          border: "none",
          background: "var(--color-primary)",
          color: "var(--color-on-primary, #FFFFFF)",
          fontFamily: "inherit",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(30, 58, 138, 0.25)",
          marginTop: 4,
          minHeight: 48,
        }}
      >
        {signInText}
      </button>
    </form>
  );
}

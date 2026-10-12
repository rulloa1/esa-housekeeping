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
  border: "1px solid #DDD5C8",
  background: "#FFFFFF",
  color: "#2C2016",
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
        <div style={{ fontSize: 11, fontWeight: 700, color: "#827263", textTransform: "uppercase", letterSpacing: 0.8 }}>
          Quick Demo Login
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button
            type="button"
            onClick={() => setCredentials("supervisor", "1234")}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: selectedRole === "supervisor" ? "2px solid #2F7A1E" : "1px solid #DDD5C8",
              background: selectedRole === "supervisor" ? "rgba(47, 122, 30, 0.08)" : "#FFFFFF",
              color: selectedRole === "supervisor" ? "#2F7A1E" : "#4A3728",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📊</span>
            <div>
              <div>Supervisor</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#827263" }}>PIN: 1234</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCredentials("housekeeper", "1234")}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: selectedRole === "housekeeper" ? "2px solid #2F7A1E" : "1px solid #DDD5C8",
              background: selectedRole === "housekeeper" ? "rgba(47, 122, 30, 0.08)" : "#FFFFFF",
              color: selectedRole === "housekeeper" ? "#2F7A1E" : "#4A3728",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🧹</span>
            <div>
              <div>Housekeeper</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#827263" }}>PIN: 1234</div>
            </div>
          </button>
        </div>
      </div>

      <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13, color: "#4A3728" }}>
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

      <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13, color: "#4A3728" }}>
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
        <div role="alert" style={{ padding: "10px 12px", borderRadius: 8, background: "#FEE2E2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13, fontWeight: 600 }}>
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
          background: "#2F7A1E",
          color: "#FFFFFF",
          fontFamily: "inherit",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(47, 122, 30, 0.25)",
          marginTop: 4,
          minHeight: 48,
        }}
      >
        {signInText}
      </button>
    </form>
  );
}

import Image from "next/image";
import { ROLES } from "@/lib/auth";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  const selectableRoles = [
    { value: "housekeeper", label: "Housekeeper" },
    { value: "supervisor", label: "Supervisor / Front Desk" },
    { value: "admin", label: "Administrator" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "linear-gradient(180deg, #F6EFE5 0%, #FAF9F5 100%)",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #E5DFD5",
          padding: "36px 28px",
          boxShadow: "0 10px 30px rgba(74, 55, 40, 0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {/* Official ESA Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <img
              src="/esa-logo.png"
              alt="Extended Stay America Suites"
              style={{ height: 48, objectFit: "contain" }}
            />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#4A3728" }}>
            Houston IAH Airport
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, color: "#2C2016" }}>
            Housekeeping Operations
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#827263" }}>
            Sign in to access your shift room board
          </p>
        </div>

        <form method="post" action="/api/login" style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13, color: "#4A3728" }}>
            Role
            <select
              name="role"
              defaultValue="housekeeper"
              style={{
                padding: "12px 14px",
                fontSize: 15,
                borderRadius: 8,
                border: "1px solid #DDD5C8",
                background: "#FFFFFF",
                color: "#2C2016",
                outline: "none",
              }}
            >
              {selectableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 13, color: "#4A3728" }}>
            Staff PIN
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="Enter PIN (dev: 1234, admin: 9999)"
              required
              style={{
                padding: "12px 14px",
                fontSize: 15,
                borderRadius: 8,
                border: "1px solid #DDD5C8",
                background: "#FFFFFF",
                color: "#2C2016",
                outline: "none",
              }}
            />
          </label>

          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "#FEE2E2",
                border: "1px solid #FECACA",
                color: "#DC2626",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              The PIN you entered is incorrect. Please try again.
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
              cursor: "pointer",
              transition: "background 0.2s",
              boxShadow: "0 2px 6px rgba(47, 122, 30, 0.25)",
            }}
          >
            Sign In
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #F3ECE2", textAlign: "center", fontSize: 12, color: "#827263" }}>
          Extended Stay America · Houston IAH Operations Portal
        </div>
      </main>
    </div>
  );
}

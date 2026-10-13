"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";
import type { StaffMember, StaffRole } from "@/lib/staff";

const ROLE_LABEL: Record<StaffRole, string> = {
  housekeeper: "Housekeeper",
  supervisor: "Supervisor / front desk",
  admin: "Administrator",
};

const REASON: Record<string, string> = {
  name: "Enter a name of 2 to 40 characters.",
  nameTaken: "Someone active on the roster already has that name.",
  role: "Pick a role.",
  pin: "A PIN is 4 to 8 digits.",
  pinTaken: "That PIN is already in use. Pick another.",
  self: "You can't switch off or demote your own sign-in.",
  adminOnly: "Only an administrator can change the roster.",
  notFound: "That person is no longer on the roster. Reload the page.",
};

const field: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 15,
  borderRadius: 8,
  border: `1px solid ${BRAND.border}`,
  background: "#fff",
  color: BRAND.text,
  fontFamily: "inherit",
  minHeight: 44,
  boxSizing: "border-box",
};

const button = (primary = false): React.CSSProperties => ({
  ...field,
  cursor: "pointer",
  fontWeight: 700,
  background: primary ? BRAND.green : "#fff",
  color: primary ? "#fff" : BRAND.text,
  border: primary ? `1px solid ${BRAND.green}` : `1px solid ${BRAND.border}`,
});

export function StaffRoster({ initialStaff, selfId }: { initialStaff: StaffMember[]; selfId: string | null }) {
  const [staff, setStaff] = useState(initialStaff);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("housekeeper");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const explain = async (res: Response) => {
    const json = await res.json().catch(() => ({}));
    if (res.ok) return json;
    setMessage({ ok: false, text: REASON[json.reason] || "That didn't save. Try again." });
    return null;
  };

  const upsert = (m: StaffMember) =>
    setStaff((list) => {
      const rest = list.filter((s) => s.id !== m.id);
      return [...rest, m].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
    });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const json = await explain(
        await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role, pin }),
        }),
      );
      if (json) {
        upsert(json.staff);
        setMessage({ ok: true, text: `${json.staff.name} can now sign in with their PIN.` });
        setName("");
        setPin("");
      }
    } finally {
      setBusy(false);
    }
  };

  const change = async (m: StaffMember, patch: Record<string, unknown>, done: string) => {
    setMessage(null);
    const json = await explain(
      await fetch(`/api/staff/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
    if (json) {
      upsert(json.staff);
      setMessage({ ok: true, text: done });
    }
  };

  const newPin = (m: StaffMember) => {
    const p = window.prompt(`New PIN for ${m.name} (4 to 8 digits):`);
    if (p !== null) change(m, { pin: p.trim() }, `${m.name}'s PIN was changed. Their old PIN no longer works.`);
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 48px", color: BRAND.text, fontFamily: BRAND.font }}>
      <h1 style={{ fontSize: 24, margin: "0 0 4px" }}>Staff roster</h1>
      <p style={{ margin: "0 0 20px", color: BRAND.muted, fontSize: 14, lineHeight: 1.5 }}>
        Give each person their own PIN. Their name then goes on every suite they work, housekeepers see only their own
        suites, and you can switch one person off without changing anyone else&apos;s PIN. The shared role PINs keep
        working until you stop handing them out.
      </p>

      <form onSubmit={add} style={{ display: "grid", gap: 10, padding: 16, background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ fontWeight: 700 }}>Add a person</div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <input aria-label="Name" placeholder="Name, e.g. Maria S." value={name} onChange={(e) => setName(e.target.value)} style={field} required />
          <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} style={field}>
            {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <input
            aria-label="PIN"
            placeholder="PIN (4–8 digits)"
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{4,8}"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            style={field}
            required
          />
        </div>
        <button type="submit" disabled={busy} style={{ ...button(true), justifySelf: "start", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Adding…" : "Add to roster"}
        </button>
      </form>

      {message && (
        <div
          role={message.ok ? "status" : "alert"}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            fontWeight: 600,
            background: message.ok ? "#ECFDF5" : "#FEE2E2",
            color: message.ok ? "#065F46" : "#B91C1C",
            border: `1px solid ${message.ok ? "#A7F3D0" : "#FECACA"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {staff.length === 0 ? (
        <p style={{ color: BRAND.muted }}>Nobody is on the roster yet. Until you add housekeepers, the assignment lists use the sample names.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {staff.map((m) => (
            <li
              key={m.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                background: "#fff",
                border: `1px solid ${BRAND.border}`,
                borderRadius: 8,
                opacity: m.active ? 1 : 0.6,
              }}
            >
              <div style={{ flex: "1 1 180px" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {m.name} {m.id === selfId && <span style={{ fontWeight: 500, color: BRAND.muted }}>(you)</span>}
                </div>
                <div style={{ fontSize: 13, color: BRAND.muted }}>{m.active ? ROLE_LABEL[m.role] : `${ROLE_LABEL[m.role]} · switched off`}</div>
              </div>
              <select
                aria-label={`Role for ${m.name}`}
                value={m.role}
                disabled={m.id === selfId}
                onChange={(e) => change(m, { role: e.target.value }, `${m.name} is now ${ROLE_LABEL[e.target.value as StaffRole]}.`)}
                style={field}
              >
                {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
              <button type="button" onClick={() => newPin(m)} style={button()}>New PIN</button>
              <button
                type="button"
                disabled={m.id === selfId}
                onClick={() =>
                  change(m, { active: !m.active }, m.active ? `${m.name} is switched off and signed out.` : `${m.name} can sign in again.`)
                }
                style={button()}
              >
                {m.active ? "Switch off" : "Switch on"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

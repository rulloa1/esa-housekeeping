import { ROLES } from "@/lib/auth";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main style={{ maxWidth: 360, margin: "0 auto", padding: "64px 16px" }}>
      <h1>Sign in</h1>
      <form method="post" action="/api/login" style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          Role
          <select name="role" defaultValue="housekeeping" style={{ padding: 10, fontSize: 16 }}>
            {Object.entries(ROLES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          PIN
          <input name="pin" type="password" inputMode="numeric" autoComplete="current-password" required style={{ padding: 10, fontSize: 16 }} />
        </label>
        {error && <p style={{ color: "#b42318", margin: 0 }}>That PIN didn&apos;t match. Try again.</p>}
        <button type="submit" style={{ padding: 12, fontSize: 16 }}>Sign in</button>
      </form>
    </main>
  );
}

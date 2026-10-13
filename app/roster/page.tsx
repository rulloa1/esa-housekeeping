import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import { listStaff, publicView } from "@/lib/staff";
import { NavigationHeader } from "@/components/NavigationHeader";
import { StaffRoster } from "@/components/StaffRoster";

export const dynamic = "force-dynamic";

// Staff roster: administrators give each person their own PIN. The API enforces admin-only too.
export default async function RosterPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.role)) redirect("/staff");
  const staff = (await listStaff()).map(publicView);
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-app, #f5f6f4)" }}>
      <NavigationHeader currentRole={session.role} />
      <StaffRoster initialStaff={staff} selfId={session.staff?.id ?? null} />
    </div>
  );
}

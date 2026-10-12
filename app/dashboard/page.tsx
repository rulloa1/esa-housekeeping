import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getAll } from "@/lib/store";
import { SupervisorDashboard } from "@/components/SupervisorDashboard";
import type { RoomDoc } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const role = await getRole();
  if (!role) {
    redirect("/login");
  }

  const { docs, version } = await getAll();
  const roomDocs = docs as Record<string, RoomDoc>;

  return <SupervisorDashboard initialDocs={roomDocs} initialVersion={version} currentRole={role} />;
}

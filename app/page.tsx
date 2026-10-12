import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getAll } from "@/lib/store";
import { SupervisorDashboard } from "@/components/SupervisorDashboard";
import { HousekeeperView } from "@/components/HousekeeperView";
import type { RoomDoc } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function Home() {
  const role = await getRole();
  if (!role) {
    redirect("/login");
  }

  const { docs, version } = await getAll();
  const roomDocs = docs as Record<string, RoomDoc>;

  // If user signed in specifically as Housekeeper, default to Housekeeper mobile view
  if (role === "housekeeper" || role === "housekeeping") {
    return <HousekeeperView initialDocs={roomDocs} initialVersion={version} currentRole={role} />;
  }

  // Otherwise render full Supervisor Operations Dashboard
  return <SupervisorDashboard initialDocs={roomDocs} initialVersion={version} currentRole={role} />;
}

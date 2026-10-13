import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAll } from "@/lib/store";
import { HousekeeperView } from "@/components/HousekeeperView";
import type { RoomDoc } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function HousekeeperPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { docs, version } = await getAll();
  const roomDocs = docs as Record<string, RoomDoc>;

  // A housekeeper who signed in with their own PIN sees "my suites"; supervisors keep the picker.
  const staffName = session.staff && session.role === "housekeeper" ? session.staff.name : undefined;
  return <HousekeeperView initialDocs={roomDocs} initialVersion={version} currentRole={session.role} staffName={staffName} />;
}

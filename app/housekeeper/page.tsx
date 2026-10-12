import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getAll } from "@/lib/store";
import { HousekeeperView } from "@/components/HousekeeperView";
import type { RoomDoc } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function HousekeeperPage() {
  const role = await getRole();
  if (!role) {
    redirect("/login");
  }

  const { docs, version } = await getAll();
  const roomDocs = docs as Record<string, RoomDoc>;

  return <HousekeeperView initialDocs={roomDocs} initialVersion={version} currentRole={role} />;
}

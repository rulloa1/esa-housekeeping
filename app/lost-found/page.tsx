import { redirect } from "next/navigation";
import { getSession, isSupervisor } from "@/lib/auth";
import { MAX_ITEMS_SHOWN, listItems } from "@/lib/lostFound";
import { NavigationHeader } from "@/components/NavigationHeader";
import { LostFound } from "@/components/LostFound";
import PageBanner, { BANNERS } from "@/components/PageBanner";

export const dynamic = "force-dynamic";

// Lost & found log. Everyone signed in can log an item; supervisors close items out
// (the API enforces that too).
export default async function LostFoundPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const items = (await listItems()).slice(0, MAX_ITEMS_SHOWN);
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-app, #f5f6f4)" }}>
      <NavigationHeader currentRole={session.role} />
      <PageBanner image={BANNERS.lobby} eyebrow="Front desk & housekeeping" title="Lost & found" subtitle="Log what you find. Supervisors record when it goes back to the guest." compact />
      <LostFound initialItems={items} canClose={isSupervisor(session.role)} staffName={session.staff?.name ?? null} />
    </div>
  );
}

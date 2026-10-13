import { redirect } from "next/navigation";
import { getSession, isSupervisor } from "@/lib/auth";
import { listNotes } from "@/lib/handover";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Handover } from "@/components/Handover";
import PageBanner, { BANNERS } from "@/components/PageBanner";

export const dynamic = "force-dynamic";

// Shift handover log. Everyone signed in can leave a note; supervisors mark notes handled
// (the API enforces that too).
export default async function HandoverPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-app, #f5f6f4)" }}>
      <NavigationHeader currentRole={session.role} />
      <PageBanner image={BANNERS.exterior} eyebrow="Shift to shift" title="Handover log" subtitle="Leave the next shift what they need to know." compact />
      <Handover initialNotes={await listNotes()} canClose={isSupervisor(session.role)} staffName={session.staff?.name ?? null} />
    </div>
  );
}

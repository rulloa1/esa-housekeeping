import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { NavigationHeader } from "@/components/NavigationHeader";
import { LockProgrammerStation } from "@/components/LockProgrammerStation";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Onity Lock Programmer & Key Encoder | Extended Stay America Houston IAH",
};

export default async function LockProgrammerPage() {
  const role = await getRole();
  if (!role) redirect("/login");

  return (
    <>
      <NavigationHeader currentRole={role} />
      <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-default, #F8FAFC)" }}>
        <LockProgrammerStation currentRole={role} />
      </main>
    </>
  );
}

import { redirect } from "next/navigation";
import { requirePlatformSession } from "@/lib/auth";
import { PlatformShell } from "@/components/platform-shell";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePlatformSession();
  if (!session) redirect("/login?platform=1");

  return (
    <PlatformShell userName={session.name} userRole={session.role}>
      {children}
    </PlatformShell>
  );
}

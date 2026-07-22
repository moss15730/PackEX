import { redirect } from "next/navigation";
import { can, requireTenantSession } from "@/lib/auth";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const session = await requireTenantSession();
  const { tenant } = await params;

  if (!session?.tenantSlug) {
    redirect("/login");
  }

  const allowed =
    session.role === "tenant_admin" ||
    can(session.role, "stations.manage") ||
    can(session.role, "claim_reasons.manage");

  if (!allowed) {
    redirect(`/t/${tenant}/dashboard`);
  }

  return children;
}

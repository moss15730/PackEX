import { redirect } from "next/navigation";
import { requireTenantSession } from "@/lib/auth";

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

  if (session.role !== "tenant_admin") {
    redirect(`/t/${tenant}/dashboard`);
  }

  return children;
}

import { redirect } from "next/navigation";
import { requireTenantSession } from "@/lib/auth";

export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const session = await requireTenantSession();
  const { tenant } = await params;
  if (!session?.tenantSlug) redirect("/login");
  redirect(`/t/${tenant}/settings/organization`);
}

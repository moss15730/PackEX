import { redirect } from "next/navigation";
import { can, requireTenantSession } from "@/lib/auth";
import { SettingsNav } from "@/components/settings-nav";

const TABS = [
  { href: "settings/organization", label: "ข้อมูลองค์กร", roles: ["tenant_admin"] },
  { href: "settings/stations", label: "สถานี", roles: ["tenant_admin", "supervisor"] },
  { href: "settings/claim-reasons", label: "เหตุผลเคลม", roles: ["tenant_admin", "supervisor"] },
  { href: "settings/employees", label: "พนักงาน", roles: ["tenant_admin"] },
  { href: "settings/billing", label: "แพ็กเกจ", roles: ["tenant_admin"] },
  { href: "settings/theme", label: "ธีม", roles: ["tenant_admin", "supervisor"] },
] as const;

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

  const tabs = TABS.filter((tab) =>
    (tab.roles as readonly string[]).includes(session.role),
  ).map((tab) => ({ href: `/t/${tenant}/${tab.href}`, label: tab.label }));

  return (
    <div>
      <SettingsNav tabs={tabs} />
      {children}
    </div>
  );
}

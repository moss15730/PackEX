import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureOnboardingState } from "@/lib/onboarding";
import { PageHeader } from "@/components/ui";
import { OrganizationSettingsForm } from "@/components/organization-settings-form";

export default async function OrganizationSettingsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      name: true,
      slug: true,
      locale: true,
      timezone: true,
      status: true,
    },
  });

  if (!tenant) return null;

  return (
    <div>
      <PageHeader title="ข้อมูลองค์กร" description="จัดการรายละเอียดองค์กรในระบบ PackEX" />
      <OrganizationSettingsForm tenant={tenant} tenantSlug={session.tenantSlug!} />
    </div>
  );
}

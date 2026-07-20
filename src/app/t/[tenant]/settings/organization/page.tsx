import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { statusLabel } from "@/lib/utils";

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
      <PageHeader title="ข้อมูลองค์กร" description="รายละเอียดองค์กรในระบบ PackEX" />
      <Card className="max-w-xl">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">ชื่อ</dt>
            <dd className="font-medium text-[var(--ink)]">{tenant.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Slug</dt>
            <dd className="font-medium text-[var(--ink)]">{tenant.slug}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">ภาษา</dt>
            <dd className="font-medium text-[var(--ink)]">{tenant.locale}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Timezone</dt>
            <dd className="font-medium text-[var(--ink)]">{tenant.timezone}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[var(--muted)]">สถานะ</dt>
            <dd>
              <Badge tone={tenant.status === "active" ? "success" : "warning"}>
                {statusLabel(tenant.status)}
              </Badge>
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

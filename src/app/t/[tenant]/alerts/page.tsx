import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncTenantAlerts } from "@/lib/alerts";
import { PageHeader } from "@/components/ui";
import { AlertsList } from "@/components/alerts-list";

export default async function AlertsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  await syncTenantAlerts(session.tenantId);

  const alerts = await prisma.alert.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="แจ้งเตือน"
        description="เหตุการณ์จากสถานีและอุปกรณ์ที่ต้องดำเนินการ"
      />
      <AlertsList
        tenantSlug={session.tenantSlug!}
        alerts={alerts.map((a) => ({
          id: a.id,
          severity: a.severity,
          title: a.title,
          message: a.message,
          acknowledged: a.acknowledged,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function AlertsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const alerts = await prisma.alert.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="แจ้งเตือน" description="เหตุการณ์ที่ต้องดำเนินการ" />

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="flex flex-wrap items-start gap-3">
            <Badge
              tone={
                alert.severity === "critical"
                  ? "danger"
                  : alert.severity === "warning"
                    ? "warning"
                    : "info"
              }
            >
              {alert.severity}
            </Badge>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-[var(--ink)]">{alert.title}</h2>
                {alert.acknowledged && <Badge tone="neutral">รับทราบแล้ว</Badge>}
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{alert.message}</p>
              <time className="mt-2 block text-xs text-[var(--muted)]">
                {format(alert.createdAt, "d MMM yyyy HH:mm", { locale: th })}
              </time>
            </div>
          </Card>
        ))}
        {alerts.length === 0 && (
          <p className="text-center text-[var(--muted)]">ไม่มีแจ้งเตือน</p>
        )}
      </div>
    </div>
  );
}

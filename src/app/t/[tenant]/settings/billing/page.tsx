import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Stat, Badge } from "@/components/ui";
import { statusLabel } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function SettingsBillingPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const tenantId = session.tenantId;

  const [subscription, usage, invoices] = await Promise.all([
    prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    }),
    prisma.usageMeter.findUnique({ where: { tenantId } }),
    prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { issuedAt: "desc" },
      take: 6,
    }),
  ]);

  if (!subscription) return null;

  const plan = subscription.plan;
  const stationsPct = usage
    ? Math.round((usage.stationsUsed / plan.maxStations) * 100)
    : 0;
  const storagePct = usage
    ? Math.round((usage.storageUsedGb / plan.maxStorageGb) * 100)
    : 0;
  const usersPct = usage ? Math.round((usage.usersUsed / plan.maxUsers) * 100) : 0;

  const nearLimit = stationsPct >= 80 || storagePct >= 80 || usersPct >= 80;
  const overLimit = stationsPct >= 100 || storagePct >= 100 || usersPct >= 100;

  return (
    <div>
      <PageHeader
        title="แพ็กเกจและการใช้งาน"
        description={`แผน ${plan.nameTh} · ${statusLabel(subscription.status)}`}
      />

      {overLimit && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          <strong>Hard limit:</strong> การใช้งานเกินแผน — อัปโหลดวิดีโอใหม่อาจถูกบล็อก
          กรุณาอัปเกรดแผนหรือลดการใช้งาน
        </div>
      )}
      {nearLimit && !overLimit && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Soft limit:</strong> ใกล้ถึงขีดจำกัดแผน — พิจารณาอัปเกรดก่อนถึง hard limit
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="สถานี"
          value={`${usage?.stationsUsed ?? 0} / ${plan.maxStations}`}
          hint={`${stationsPct}%`}
        />
        <Stat
          label="พื้นที่"
          value={`${usage?.storageUsedGb.toFixed(1) ?? 0} / ${plan.maxStorageGb} GB`}
          hint={`${storagePct}%`}
        />
        <Stat
          label="ผู้ใช้"
          value={`${usage?.usersUsed ?? 0} / ${plan.maxUsers}`}
          hint={`${usersPct}%`}
        />
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 font-semibold text-[var(--ink)]">ใบแจ้งหนี้</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="pb-2 font-medium">รายการ</th>
              <th className="pb-2 font-medium">จำนวน</th>
              <th className="pb-2 font-medium">สถานะ</th>
              <th className="pb-2 font-medium">วันที่</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2">{inv.description}</td>
                <td className="py-2">
                  {inv.amount.toLocaleString()} {inv.currency}
                </td>
                <td className="py-2">
                  <Badge tone={inv.status === "paid" ? "success" : "warning"}>
                    {inv.status}
                  </Badge>
                </td>
                <td className="py-2 text-[var(--muted)]">
                  {format(inv.issuedAt, "d MMM yyyy", { locale: th })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

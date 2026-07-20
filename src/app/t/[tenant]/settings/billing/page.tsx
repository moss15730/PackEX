import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Stat, Badge, TableScroll } from "@/components/ui";
import { statusLabel } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getUsageAndLimits } from "@/lib/tenant-limits";

export default async function SettingsBillingPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const tenantId = session.tenantId;

  const [subscription, { limits, usage }, invoices] = await Promise.all([
    prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    }),
    getUsageAndLimits(tenantId),
    prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { issuedAt: "desc" },
      take: 6,
    }),
  ]);

  if (!subscription || !limits) return null;

  const plan = subscription.plan;
  const maxStations = limits.maxStations;
  const maxStorageGb = limits.maxStorageGb;
  const maxUsers = limits.maxUsers;

  const stationsPct = Math.round((usage.stationsUsed / maxStations) * 100);
  const storagePct = Math.round((usage.storageUsedGb / maxStorageGb) * 100);
  const usersPct = Math.round((usage.usersUsed / maxUsers) * 100);

  const nearLimit = stationsPct >= 80 || storagePct >= 80 || usersPct >= 80;
  const overLimit = stationsPct >= 100 || storagePct >= 100 || usersPct >= 100;

  return (
    <div>
      <PageHeader
        title="แพ็กเกจและการใช้งาน"
        description={`แผน ${plan.nameTh} · ${statusLabel(subscription.status)}`}
      />

      {limits.maxStationsOverride != null ||
      limits.maxStorageGbOverride != null ||
      limits.maxUsersOverride != null ? (
        <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">
          องค์กรนี้มีโควต้าเฉพาะที่ Platform Admin กำหนด (อาจต่างจากแผนมาตรฐาน)
        </div>
      ) : null}

      {overLimit && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          <strong>เกินขีดจำกัด:</strong> ไม่สามารถเพิ่มสถานี/ผู้ใช้ หรืออัดวิดีโอใหม่ได้
          จนกว่าจะลดการใช้งานหรือขอเพิ่มโควต้า
        </div>
      )}
      {nearLimit && !overLimit && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>ใกล้เต็ม:</strong> การใช้งานใกล้ถึงขีดจำกัด — พิจารณาลบวิดีโอเก่าหรือขอเพิ่มโควต้า
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="สถานี"
          value={`${usage.stationsUsed} / ${maxStations}`}
          hint={`${stationsPct}%`}
        />
        <Stat
          label="พื้นที่วิดีโอ"
          value={`${usage.storageUsedGb.toFixed(2)} / ${maxStorageGb} GB`}
          hint={`${storagePct}%`}
        />
        <Stat
          label="ผู้ใช้"
          value={`${usage.usersUsed} / ${maxUsers}`}
          hint={`${usersPct}%`}
        />
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 font-semibold text-[var(--ink)]">ใบแจ้งหนี้</h2>
        <div className="space-y-3 md:hidden">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm"
            >
              <p className="font-medium text-[var(--ink)]">{inv.description}</p>
              <p className="mt-1 text-[var(--muted)]">
                {inv.amount.toLocaleString()} {inv.currency} · {format(inv.issuedAt, "d MMM yyyy", { locale: th })}
              </p>
              <Badge tone={inv.status === "paid" ? "success" : "warning"} className="mt-2">
                {inv.status}
              </Badge>
            </div>
          ))}
        </div>
        <div className="hidden md:block">
          <TableScroll>
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
          </TableScroll>
        </div>
      </Card>
    </div>
  );
}

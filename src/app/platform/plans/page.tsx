import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import { requirePlatformSession } from "@/lib/auth";
import { PlatformPlansManager } from "@/components/platform-plans-manager";

export default async function PlatformPlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: { priceMonthly: "asc" },
    include: {
      subscriptions: {
        include: { tenant: { select: { slug: true, name: true, status: true } } },
      },
    },
  });
  const session = await requirePlatformSession();
  const canManage = session?.role === "super_admin";

  const planItems = plans.map((p) => ({
    ...p,
    subscriptions: p.subscriptions.map((s) => ({
      slug: s.tenant.slug,
      name: s.tenant.name,
      status: s.tenant.status,
    })),
  }));

  return (
    <div>
      <PageHeader title="แผนราคา" description="แพ็กเกจที่เปิดขายบนแพลตฟอร์ม" />

      {canManage ? (
        <PlatformPlansManager plans={planItems} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
        {planItems.map((plan) => (
          <Card key={plan.id}>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
              {plan.nameTh}
            </h2>
            <p className="text-sm text-[var(--muted)]">{plan.nameEn}</p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold">
              {plan.priceMonthly > 0 ? `฿${plan.priceMonthly.toLocaleString()}/เดือน` : "ติดต่อเรา"}
            </p>
            <ul className="mt-4 space-y-1 text-sm text-[var(--muted)]">
              <li>สถานี: {plan.maxStations}</li>
              <li>พื้นที่: {plan.maxStorageGb} GB</li>
              <li>ผู้ใช้: {plan.maxUsers}</li>
              <li>เก็บข้อมูล: {plan.retentionDays} วัน</li>
              <li>ทดลอง: {plan.trialDays} วัน</li>
            </ul>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
}

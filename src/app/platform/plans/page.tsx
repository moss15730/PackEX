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
      <PageHeader
        title="แผนบริการ"
        description="แพ็กเกจที่เปิดขายบนแพลตฟอร์มและโควต้าที่กำหนดไว้"
      />

      {canManage ? (
        <PlatformPlansManager plans={planItems} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {planItems.map((plan) => (
            <Card key={plan.id} interactive>
              <h2 className="text-lg font-semibold tracking-tight text-ink">{plan.nameTh}</h2>
              <p className="text-[13px] text-muted">{plan.nameEn}</p>
              <p className="tabular mt-4 text-2xl font-semibold tracking-tight text-ink">
                {plan.priceMonthly > 0 ? (
                  <>
                    ฿{plan.priceMonthly.toLocaleString()}
                    <span className="text-base font-normal text-muted">/เดือน</span>
                  </>
                ) : (
                  "ติดต่อเรา"
                )}
              </p>
              <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[13px]">
                {[
                  { k: "สถานี", v: plan.maxStations },
                  { k: "พื้นที่", v: `${plan.maxStorageGb} GB` },
                  { k: "ผู้ใช้", v: plan.maxUsers },
                  { k: "เก็บข้อมูล", v: `${plan.retentionDays} วัน` },
                  { k: "ทดลองใช้", v: `${plan.trialDays} วัน` },
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{row.k}</dt>
                    <dd className="tabular font-medium text-ink">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

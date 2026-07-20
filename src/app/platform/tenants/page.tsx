import { redirect } from "next/navigation";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PlatformTenantsManager } from "@/components/platform-tenants-manager";

export default async function PlatformTenantsPage() {
  const session = await requirePlatformSession();
  if (!session) redirect("/login?platform=1");

  const canManage = session.role === "super_admin";

  const [tenants, plans] = await Promise.all([
    prisma.tenant.findMany({
      where: { status: { not: "deleted" } },
      include: {
        subscription: { include: { plan: true } },
        usageMeters: true,
        _count: { select: { users: true, stations: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" },
      select: { id: true, nameTh: true, maxStorageGb: true, maxUsers: true },
    }),
  ]);

  const tenantItems = tenants.map((t) => {
    const usage = t.usageMeters[0];
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      planId: t.subscription?.planId ?? null,
      planName: t.subscription?.plan.nameTh ?? null,
      maxStorageGb: t.subscription?.plan.maxStorageGb ?? null,
      stationCount: t._count.stations,
      userCount: t._count.users,
      storageUsedGb: usage?.storageUsedGb ?? 0,
    };
  });

  return (
    <div>
      <PageHeader title="Tenants" description="องค์กรทั้งหมดบนแพลตฟอร์ม" />

      {canManage ? (
        <PlatformTenantsManager tenants={tenantItems} plans={plans} />
      ) : (
        <p className="text-sm text-[var(--muted)]">ไม่มีสิทธิ์จัดการองค์กร</p>
      )}
    </div>
  );
}

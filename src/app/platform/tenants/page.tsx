import { redirect } from "next/navigation";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PlatformTenantsManager } from "@/components/platform-tenants-manager";
import { getTenantLimits, syncUsageMeter } from "@/lib/tenant-limits";

export default async function PlatformTenantsPage() {
  const session = await requirePlatformSession();
  if (!session) redirect("/login?platform=1");

  const canManage = session.role === "super_admin";

  const [tenants, plans] = await Promise.all([
    prisma.tenant.findMany({
      where: { status: { not: "deleted" } },
      include: {
        settings: true,
        subscription: { include: { plan: true } },
        usageMeters: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" },
      select: {
        id: true,
        nameTh: true,
        maxStorageGb: true,
        maxUsers: true,
        maxStations: true,
      },
    }),
  ]);

  await Promise.all(tenants.map((t) => syncUsageMeter(t.id)));

  const usageByTenant = new Map(
    (
      await prisma.usageMeter.findMany({
        where: { tenantId: { in: tenants.map((t) => t.id) } },
      })
    ).map((m) => [m.tenantId, m]),
  );

  const tenantItems = await Promise.all(
    tenants.map(async (t) => {
      const usage = usageByTenant.get(t.id);
      const limits = await getTenantLimits(t.id);
      const plan = t.subscription?.plan;

      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        planId: t.subscription?.planId ?? null,
        planName: plan?.nameTh ?? null,
        planMaxStations: plan?.maxStations ?? null,
        planMaxStorageGb: plan?.maxStorageGb ?? null,
        planMaxUsers: plan?.maxUsers ?? null,
        maxStations: limits?.maxStations ?? plan?.maxStations ?? null,
        maxStorageGb: limits?.maxStorageGb ?? plan?.maxStorageGb ?? null,
        maxUsers: limits?.maxUsers ?? plan?.maxUsers ?? null,
        maxStationsOverride: limits?.maxStationsOverride ?? null,
        maxStorageGbOverride: limits?.maxStorageGbOverride ?? null,
        maxUsersOverride: limits?.maxUsersOverride ?? null,
        stationCount: usage?.stationsUsed ?? 0,
        userCount: usage?.usersUsed ?? 0,
        storageUsedGb: usage?.storageUsedGb ?? 0,
      };
    }),
  );

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

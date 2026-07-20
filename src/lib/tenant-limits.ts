import { prisma } from "@/lib/db";

export type TenantLimits = {
  maxStations: number;
  maxStorageGb: number;
  maxUsers: number;
  planMaxStations: number;
  planMaxStorageGb: number;
  planMaxUsers: number;
  maxStationsOverride: number | null;
  maxStorageGbOverride: number | null;
  maxUsersOverride: number | null;
};

export type UsageSnapshot = {
  stationsUsed: number;
  usersUsed: number;
  storageUsedGb: number;
};

const BYTES_PER_GB = 1024 ** 3;

export async function getTenantLimits(tenantId: string): Promise<TenantLimits | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      settings: true,
      subscription: { include: { plan: true } },
    },
  });

  if (!tenant?.subscription?.plan) return null;

  const plan = tenant.subscription.plan;
  const settings = tenant.settings;

  return {
    planMaxStations: plan.maxStations,
    planMaxStorageGb: plan.maxStorageGb,
    planMaxUsers: plan.maxUsers,
    maxStationsOverride: settings?.maxStationsOverride ?? null,
    maxStorageGbOverride: settings?.maxStorageGbOverride ?? null,
    maxUsersOverride: settings?.maxUsersOverride ?? null,
    maxStations: settings?.maxStationsOverride ?? plan.maxStations,
    maxStorageGb: settings?.maxStorageGbOverride ?? plan.maxStorageGb,
    maxUsers: settings?.maxUsersOverride ?? plan.maxUsers,
  };
}

/** Reconcile usage meter from live DB counts (stations, users, video file sizes). */
export async function syncUsageMeter(tenantId: string): Promise<UsageSnapshot> {
  const [stationsUsed, usersUsed, fileAgg] = await Promise.all([
    prisma.station.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.recordingFile.aggregate({
      where: { recording: { tenantId } },
      _sum: { sizeBytes: true },
    }),
  ]);

  const storageUsedGb = (fileAgg._sum.sizeBytes ?? 0) / BYTES_PER_GB;

  await prisma.usageMeter.upsert({
    where: { tenantId },
    update: { stationsUsed, usersUsed, storageUsedGb },
    create: { tenantId, stationsUsed, usersUsed, storageUsedGb },
  });

  return { stationsUsed, usersUsed, storageUsedGb };
}

export async function getUsageAndLimits(tenantId: string) {
  const [limits, usage] = await Promise.all([
    getTenantLimits(tenantId),
    syncUsageMeter(tenantId),
  ]);
  return { limits, usage };
}

export function isStorageFull(usage: UsageSnapshot, limits: TenantLimits) {
  return usage.storageUsedGb >= limits.maxStorageGb;
}

export function isStationLimitReached(usage: UsageSnapshot, limits: TenantLimits) {
  return usage.stationsUsed >= limits.maxStations;
}

export function isUserLimitReached(usage: UsageSnapshot, limits: TenantLimits) {
  return usage.usersUsed >= limits.maxUsers;
}

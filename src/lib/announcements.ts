import { prisma } from "./db";

type AnnouncementLike = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  targetAll: boolean;
};

async function resolveTargetTenantIds(
  targetAll: boolean,
  tenantIds: string[] | undefined,
): Promise<string[]> {
  if (targetAll) {
    const tenants = await prisma.tenant.findMany({
      where: { status: { not: "deleted" } },
      select: { id: true },
    });
    return tenants.map((t) => t.id);
  }

  if (!tenantIds?.length) return [];

  const tenants = await prisma.tenant.findMany({
    where: {
      id: { in: tenantIds },
      status: { not: "deleted" },
    },
    select: { id: true },
  });
  return tenants.map((t) => t.id);
}

export async function syncAnnouncementTargets(
  announcementId: string,
  targetAll: boolean,
  tenantIds?: string[],
) {
  const targets = await resolveTargetTenantIds(targetAll, tenantIds);

  await prisma.announcementTarget.deleteMany({
    where: {
      announcementId,
      tenantId: { notIn: targets },
    },
  });

  if (targets.length === 0) return;

  await prisma.announcementTarget.createMany({
    data: targets.map((tenantId) => ({ announcementId, tenantId })),
    skipDuplicates: true,
  });
}

export async function syncAnnouncementAlerts(announcement: AnnouncementLike) {
  const targets = await prisma.announcementTarget.findMany({
    where: { announcementId: announcement.id },
    select: { tenantId: true },
  });
  const tenantIds = targets.map((t) => t.tenantId);

  if (!announcement.active || tenantIds.length === 0) {
    await prisma.alert.deleteMany({ where: { announcementId: announcement.id } });
    return;
  }

  await prisma.alert.deleteMany({
    where: {
      announcementId: announcement.id,
      tenantId: { notIn: tenantIds },
    },
  });

  for (const tenantId of tenantIds) {
    await prisma.alert.upsert({
      where: {
        announcementId_tenantId: {
          announcementId: announcement.id,
          tenantId,
        },
      },
      create: {
        tenantId,
        announcementId: announcement.id,
        severity: "info",
        title: announcement.title,
        message: announcement.body,
      },
      update: {
        title: announcement.title,
        message: announcement.body,
        severity: "info",
      },
    });
  }
}

export async function publishAnnouncement(
  announcement: AnnouncementLike,
  tenantIds?: string[],
) {
  await syncAnnouncementTargets(announcement.id, announcement.targetAll, tenantIds);
  await syncAnnouncementAlerts(announcement);
}

export async function ensureTenantAnnouncementAlerts(tenantId: string) {
  const announcements = await prisma.announcement.findMany({
    where: { active: true },
    include: { targets: { select: { tenantId: true } } },
  });

  for (const announcement of announcements) {
    const isTargeted =
      announcement.targetAll ||
      announcement.targets.some((target) => target.tenantId === tenantId);

    if (!isTargeted) {
      await prisma.alert.deleteMany({
        where: { announcementId: announcement.id, tenantId },
      });
      continue;
    }

    await prisma.alert.upsert({
      where: {
        announcementId_tenantId: {
          announcementId: announcement.id,
          tenantId,
        },
      },
      create: {
        tenantId,
        announcementId: announcement.id,
        severity: "info",
        title: announcement.title,
        message: announcement.body,
      },
      update: {
        title: announcement.title,
        message: announcement.body,
        severity: "info",
      },
    });
  }
}

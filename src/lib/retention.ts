import { prisma } from "@/lib/db";
import { deleteRecordingFiles } from "@/lib/storage";
import { syncUsageMeter } from "@/lib/tenant-limits";
import { cleanupStuckRecordings } from "@/lib/recording-cleanup";
import { pruneRateLimitBuckets } from "@/lib/rate-limit";

const STALE_HEARTBEAT_MS = 5 * 60 * 1000;

export type RetentionPurgeResult = {
  purgedRecordings: number;
  purgedFiles: number;
  stationsMarkedOffline: number;
  stuckRecordingsCanceled: number;
  tenantsSuspended: number;
  errors: string[];
};

async function suspendExpiredTrials(): Promise<number> {
  const now = new Date();
  const expired = await prisma.subscription.findMany({
    where: {
      status: "trialing",
      trialEndsAt: { lt: now },
      tenant: { status: { in: ["trial", "active"] } },
    },
    select: { id: true, tenantId: true },
    take: 200,
  });

  for (const sub of expired) {
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "past_due" },
      }),
      prisma.tenant.update({
        where: { id: sub.tenantId },
        data: { status: "suspended" },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: sub.tenantId,
          action: "billing.trial_expired_suspend",
          entityType: "tenant",
          entityId: sub.tenantId,
        },
      }),
      prisma.alert.create({
        data: {
          tenantId: sub.tenantId,
          severity: "critical",
          title: "หมดช่วงทดลองใช้งาน",
          message: "บัญชีถูกระงับเพราะหมด trial — ติดต่อ PackEX เพื่อต่ออายุหรืออัปเกรดแพ็กเกจ",
        },
      }),
    ]);
  }

  // Past-due subscriptions whose period ended → suspend tenant if still active
  const pastDue = await prisma.subscription.findMany({
    where: {
      status: { in: ["past_due", "canceled"] },
      currentPeriodEnd: { lt: now },
      tenant: { status: { in: ["trial", "active"] } },
    },
    select: { id: true, tenantId: true },
    take: 200,
  });

  for (const sub of pastDue) {
    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: sub.tenantId },
        data: { status: "suspended" },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: sub.tenantId,
          action: "billing.past_due_suspend",
          entityType: "tenant",
          entityId: sub.tenantId,
        },
      }),
    ]);
  }

  return expired.length + pastDue.length;
}

/** Hard-delete soft-deleted recordings past softDeleteDays; mark stale agents offline; suspend expired trials. */
export async function runRetentionMaintenance(): Promise<RetentionPurgeResult> {
  pruneRateLimitBuckets();

  const stuck = await cleanupStuckRecordings();

  const result: RetentionPurgeResult = {
    purgedRecordings: 0,
    purgedFiles: 0,
    stationsMarkedOffline: 0,
    stuckRecordingsCanceled: stuck.recordingsCanceled,
    tenantsSuspended: 0,
    errors: [],
  };

  result.tenantsSuspended = await suspendExpiredTrials();

  const tenants = await prisma.tenant.findMany({
    where: { status: { not: "deleted" } },
    include: { settings: { select: { softDeleteDays: true } } },
  });

  const now = Date.now();

  for (const tenant of tenants) {
    const softDeleteDays = tenant.settings?.softDeleteDays ?? 14;
    const cutoff = new Date(now - softDeleteDays * 24 * 60 * 60 * 1000);

    const expired = await prisma.recording.findMany({
      where: {
        tenantId: tenant.id,
        status: "deleted",
        deletedAt: { lte: cutoff },
        legalHold: false,
      },
      include: {
        files: { select: { storagePath: true } },
        snapshots: { select: { storagePath: true } },
      },
      take: 100,
    });

    for (const recording of expired) {
      try {
        const paths = [
          ...recording.files.map((f) => f.storagePath),
          ...recording.snapshots.map((s) => s.storagePath),
        ];
        const deletedCount = await deleteRecordingFiles(paths);
        result.purgedFiles += deletedCount;

        await prisma.recordingFile.deleteMany({ where: { recordingId: recording.id } });
        await prisma.snapshot.deleteMany({ where: { recordingId: recording.id } });
        await prisma.timelineMarker.deleteMany({ where: { recordingId: recording.id } });
        await prisma.recording.update({
          where: { id: recording.id },
          data: {
            cancelReason: recording.cancelReason
              ? `${recording.cancelReason}|purged`
              : "purged_after_soft_delete",
          },
        });

        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: "video.purge",
            entityType: "recording",
            entityId: recording.id,
            meta: JSON.stringify({
              softDeleteDays,
              filesRemoved: paths.length,
              deletedAt: recording.deletedAt?.toISOString(),
            }),
          },
        });

        result.purgedRecordings += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "purge failed";
        result.errors.push(`${recording.id}: ${message}`);
      }
    }

    if (expired.length > 0) {
      await syncUsageMeter(tenant.id).catch(() => undefined);
    }
  }

  const staleBefore = new Date(now - STALE_HEARTBEAT_MS);
  const staleAgents = await prisma.stationAgent.findMany({
    where: {
      OR: [
        { lastHeartbeatAt: null },
        { lastHeartbeatAt: { lt: staleBefore } },
      ],
      online: true,
    },
    include: { station: { select: { id: true, status: true } } },
  });

  for (const agent of staleAgents) {
    await prisma.stationAgent.update({
      where: { id: agent.id },
      data: { online: false },
    });
    const status = agent.station.status;
    if (
      status !== "recording" &&
      status !== "uploading" &&
      status !== "syncing" &&
      status !== "disabled" &&
      status !== "blocked"
    ) {
      await prisma.station.update({
        where: { id: agent.stationId },
        data: { status: "offline" },
      });
      result.stationsMarkedOffline += 1;
    }
  }

  return result;
}

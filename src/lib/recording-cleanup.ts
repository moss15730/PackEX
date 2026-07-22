import { prisma } from "@/lib/db";

const STUCK_RECORDING_MS = 2 * 60 * 60 * 1000; // 2 hours

export type StuckCleanupResult = {
  recordingsCanceled: number;
  stationsReset: number;
};

/** Cancel orphaned in-progress recordings (tab crash / abandoned console). */
export async function cleanupStuckRecordings(
  tenantId?: string,
): Promise<StuckCleanupResult> {
  const cutoff = new Date(Date.now() - STUCK_RECORDING_MS);
  const stuck = await prisma.recording.findMany({
    where: {
      status: "recording",
      startedAt: { lt: cutoff },
      ...(tenantId ? { tenantId } : {}),
    },
    select: { id: true, tenantId: true, stationId: true },
    take: 200,
  });

  let stationsReset = 0;
  const stationIds = new Set<string>();

  for (const rec of stuck) {
    await prisma.recording.update({
      where: { id: rec.id },
      data: {
        status: "canceled",
        endedAt: new Date(),
        cancelReason: "stuck_recording_timeout",
      },
    });
    stationIds.add(rec.stationId);

    await prisma.auditLog.create({
      data: {
        tenantId: rec.tenantId,
        action: "recording.stuck_cleanup",
        entityType: "recording",
        entityId: rec.id,
        meta: JSON.stringify({ reason: "startedAt older than 2h" }),
      },
    });
  }

  for (const stationId of stationIds) {
    const stillRecording = await prisma.recording.count({
      where: { stationId, status: "recording" },
    });
    if (stillRecording === 0) {
      await prisma.station.update({
        where: { id: stationId },
        data: { status: "ready" },
      });
      stationsReset += 1;
    }
  }

  return { recordingsCanceled: stuck.length, stationsReset };
}

import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncUsageMeter } from "@/lib/tenant-limits";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (!can(session.role, "video.delete")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบวิดีโอ" }, { status: 403 });
  }

  const recording = await prisma.recording.findFirst({
    where: {
      id,
      tenantId: session.tenantId,
      status: { not: "deleted" },
    },
    include: {
      files: { select: { id: true } },
      snapshots: { select: { id: true } },
    },
  });

  if (!recording) {
    return NextResponse.json({ error: "ไม่พบวิดีโอ" }, { status: 404 });
  }

  if (recording.legalHold) {
    return NextResponse.json(
      { error: "วิดีโอนี้อยู่ใน Legal Hold ไม่สามารถลบได้" },
      { status: 400 },
    );
  }

  const wasRecording = recording.status === "recording";

  // Soft delete only — keep blobs for restore window (softDeleteDays).
  await prisma.recording.update({
    where: { id: recording.id },
    data: {
      status: "deleted",
      deletedAt: new Date(),
      ...(wasRecording
        ? {
            endedAt: new Date(),
            cancelReason: "deleted_while_recording",
          }
        : {}),
    },
  });

  if (wasRecording) {
    await prisma.station.update({
      where: { id: recording.stationId },
      data: { status: "ready" },
    });
  }

  await syncUsageMeter(session.tenantId);

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "video.delete",
      entityType: "recording",
      entityId: recording.id,
      meta: JSON.stringify({
        wasRecording,
        softDelete: true,
        fileCount: recording.files.length,
        snapshotCount: recording.snapshots.length,
      }),
    },
  });

  return NextResponse.json({ ok: true, wasRecording, softDelete: true });
}

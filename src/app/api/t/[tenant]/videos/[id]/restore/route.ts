import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncUsageMeter } from "@/lib/tenant-limits";
import { denyIfReadOnly } from "@/lib/tenant-access";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const denied = await denyIfReadOnly(session.tenantId);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  if (!can(session.role, "video.delete")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์กู้คืนวิดีโอ" }, { status: 403 });
  }

  const recording = await prisma.recording.findFirst({
    where: {
      id,
      tenantId: session.tenantId,
      status: "deleted",
    },
    include: {
      files: { select: { id: true } },
    },
  });

  if (!recording || !recording.deletedAt) {
    return NextResponse.json({ error: "ไม่พบวิดีโอในถังลบ" }, { status: 404 });
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: session.tenantId },
    select: { softDeleteDays: true },
  });
  const softDeleteDays = settings?.softDeleteDays ?? 14;
  const ageMs = Date.now() - recording.deletedAt.getTime();
  if (ageMs > softDeleteDays * 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      {
        error: `หมดช่วงกู้คืนแล้ว (${softDeleteDays} วัน) — ไม่สามารถกู้คืนได้`,
      },
      { status: 400 },
    );
  }

  const restoredStatus =
    recording.files.length === 0
      ? "canceled"
      : recording.completenessScore >= 70
        ? "ready"
        : "warning";

  await prisma.recording.update({
    where: { id: recording.id },
    data: {
      status: restoredStatus,
      deletedAt: null,
      cancelReason:
        recording.cancelReason === "deleted_while_recording"
          ? null
          : recording.cancelReason,
    },
  });

  await syncUsageMeter(session.tenantId);

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "video.restore",
      entityType: "recording",
      entityId: recording.id,
      meta: JSON.stringify({ restoredStatus }),
    },
  });

  return NextResponse.json({ ok: true, status: restoredStatus });
}

import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { alertLowCompleteness } from "@/lib/alerts";
import { refreshOnboardingState } from "@/lib/onboarding";
import { getUsageAndLimits, isStorageFull, syncUsageMeter } from "@/lib/tenant-limits";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const stationId = new URL(req.url).searchParams.get("stationId");
  if (!stationId) {
    return NextResponse.json({ error: "กรุณาระบุสถานี" }, { status: 400 });
  }

  const station = await prisma.station.findFirst({
    where: {
      id: stationId,
      tenantId: session.tenantId,
      status: { in: ["ready", "idle"] },
    },
  });

  if (!station) {
    return NextResponse.json({ error: "ไม่พบสถานีหรือสถานีไม่พร้อมใช้งาน" }, { status: 404 });
  }

  return NextResponse.json({
    station: { id: station.id, code: station.code, name: station.name },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const body = await req.json();
  const { action, orderNo, recordingId, clientUploaded, stationId } = body as {
    action?: "start" | "stop";
    orderNo?: string;
    recordingId?: string;
    clientUploaded?: boolean;
    stationId?: string;
  };

  if (action === "start") {
    if (!can(session.role, "recording.start")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เริ่มอัด" }, { status: 403 });
    }
    if (!orderNo) {
      return NextResponse.json({ error: "กรุณาระบุเลขออเดอร์" }, { status: 400 });
    }
    if (!stationId) {
      return NextResponse.json({ error: "กรุณาเลือกสถานีก่อนเริ่มอัด" }, { status: 400 });
    }

    const tenantId = session.tenantId;

    const { limits, usage } = await getUsageAndLimits(tenantId);
    if (!limits) {
      return NextResponse.json({ error: "ไม่พบแพ็กเกจขององค์กร" }, { status: 400 });
    }
    if (isStorageFull(usage, limits)) {
      return NextResponse.json(
        {
          error: `ความจุวิดีโอเต็มแล้ว (${usage.storageUsedGb.toFixed(1)}/${limits.maxStorageGb} GB) — ไม่สามารถอัดวิดีโอใหม่ได้`,
        },
        { status: 400 },
      );
    }

    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        tenantId,
        status: { in: ["ready", "idle"] },
      },
      include: { cameras: { where: { active: true } } },
    });

    if (!station) {
      return NextResponse.json({ error: "ไม่พบสถานีหรือสถานีไม่พร้อมใช้งาน" }, { status: 400 });
    }

    const order = await prisma.order.upsert({
      where: { tenantId_orderNo: { tenantId, orderNo } },
      create: {
        tenantId,
        orderNo,
        status: "packing",
        source: "manual",
      },
      update: { status: "packing" },
    });

    const recording = await prisma.recording.create({
      data: {
        tenantId,
        orderId: order.id,
        stationId: station.id,
        employeeId: session.id,
        status: "recording",
        completenessScore: 0,
      },
    });

    await prisma.station.update({
      where: { id: station.id },
      data: { status: "recording" },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.id,
        action: "recording.start",
        entityType: "recording",
        entityId: recording.id,
        meta: JSON.stringify({ orderNo }),
      },
    });

    return NextResponse.json({
      ok: true,
      recordingId: recording.id,
      orderNo: order.orderNo,
      stationCode: station.code,
    });
  }

  if (action === "stop") {
    if (!can(session.role, "recording.stop")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์หยุดอัด" }, { status: 403 });
    }
    if (!recordingId) {
      return NextResponse.json({ error: "กรุณาระบุ recording" }, { status: 400 });
    }

    const tenantId = session.tenantId;

    const recording = await prisma.recording.findFirst({
      where: { id: recordingId, tenantId, status: "recording" },
      include: {
        station: { include: { cameras: { where: { active: true } } } },
        order: { select: { orderNo: true } },
      },
    });

    if (!recording) {
      return NextResponse.json({ error: "ไม่พบการอัดที่กำลังดำเนินอยู่" }, { status: 404 });
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    const durationSec = Math.max(
      1,
      Math.floor((Date.now() - recording.startedAt.getTime()) / 1000),
    );

    const minSec = settings?.minRecordingSeconds ?? 15;
    const minCams = settings?.minCameras ?? 1;
    const snapshotRequired = settings?.snapshotRequired ?? true;

    const uploadedFiles = await prisma.recordingFile.count({
      where: { recordingId: recording.id },
    });
    const uploadedSnapshots = await prisma.snapshot.count({
      where: { recordingId: recording.id },
    });

    if (!clientUploaded || uploadedFiles === 0) {
      return NextResponse.json(
        { error: "ไม่พบไฟล์วิดีโอที่อัปโหลด — กรุณาอัดและอัปโหลดวิดีโอก่อนหยุด" },
        { status: 400 },
      );
    }

    let score = 100;
    if (durationSec < minSec) score -= 25;
    if (uploadedFiles < minCams) score -= 30;
    if (snapshotRequired && uploadedSnapshots === 0) score -= 20;
    score = Math.max(0, Math.min(100, score));

    const updated = await prisma.recording.update({
      where: { id: recording.id },
      data: {
        status: score >= 70 ? "ready" : "warning",
        endedAt: new Date(),
        durationSec,
        completenessScore: score,
        markers: {
          create: [
            { label: "สแกนเริ่ม", atSec: 0, kind: "scan" },
            { label: "สแกนจบ", atSec: durationSec, kind: "scan" },
          ],
        },
      },
    });

    await prisma.order.update({
      where: { id: recording.orderId },
      data: { status: "packed" },
    });

    await prisma.station.update({
      where: { id: recording.stationId },
      data: { status: "ready" },
    });

    await syncUsageMeter(tenantId);
    await refreshOnboardingState(tenantId);
    await alertLowCompleteness(tenantId, recording.id, recording.order.orderNo, score);

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.id,
        action: "recording.stop",
        entityType: "recording",
        entityId: recording.id,
        meta: JSON.stringify({ completenessScore: score, durationSec, uploadedFiles }),
      },
    });

    return NextResponse.json({
      ok: true,
      recordingId: updated.id,
      completenessScore: score,
      durationSec,
    });
  }

  return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
}

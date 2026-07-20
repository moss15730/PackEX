import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
      status: { notIn: ["offline", "blocked", "disk_full"] },
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

    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        tenantId,
        status: { notIn: ["offline", "blocked", "disk_full"] },
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
      include: { station: { include: { cameras: { where: { active: true } } } } },
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
    const usedDeviceCamera = Boolean(clientUploaded) || uploadedFiles > 0;

    const activeCameras = usedDeviceCamera
      ? Math.max(uploadedFiles, 1)
      : recording.station.cameras.length;
    let score = 100;
    if (durationSec < minSec) score -= 25;
    if (activeCameras < minCams) score -= 30;
    if (snapshotRequired && uploadedSnapshots === 0 && !usedDeviceCamera) score -= 0;
    if (usedDeviceCamera && uploadedFiles === 0) score -= 40;
    score = Math.max(40, Math.min(100, score - (usedDeviceCamera ? 0 : Math.floor(Math.random() * 10))));

    const updated = await prisma.recording.update({
      where: { id: recording.id },
      data: {
        status: score >= 70 ? "ready" : "warning",
        endedAt: new Date(),
        durationSec,
        completenessScore: score,
        ...(usedDeviceCamera
          ? {}
          : {
              files: {
                create: recording.station.cameras.map((cam, i) => ({
                  cameraLabel: cam.name,
                  storagePath: `/${tenantId}/recordings/${recording.id}/${cam.id}.mp4`,
                  sizeBytes: 20_000_000 + i * 5_000_000,
                  sha256: `${recording.id}${i}`.padEnd(64, "0").slice(0, 64),
                })),
              },
              ...(snapshotRequired
                ? {
                    snapshots: {
                      create: {
                        storagePath: `/${tenantId}/snapshots/${recording.id}/preclose.jpg`,
                        sha256: `${recording.id}s`.padEnd(64, "0").slice(0, 64),
                      },
                    },
                  }
                : {}),
            }),
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
      data: { status: "idle" },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.id,
        action: "recording.stop",
        entityType: "recording",
        entityId: recording.id,
        meta: JSON.stringify({ completenessScore: score }),
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

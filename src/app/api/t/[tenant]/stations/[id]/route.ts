import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncUsageMeter } from "@/lib/tenant-limits";

const ALLOWED_STATUS = [
  "idle",
  "ready",
  "warning",
  "offline",
  "blocked",
  "camera_error",
  "disk_full",
] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (!can(session.role, "stations.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการสถานี" }, { status: 403 });
  }

  const station = await prisma.station.findFirst({
    where: { id, tenantId: session.tenantId },
  });

  if (!station) {
    return NextResponse.json({ error: "ไม่พบสถานี" }, { status: 404 });
  }

  if (station.status === "recording") {
    return NextResponse.json(
      { error: "สถานีกำลังอัดวิดีโออยู่ — หยุดอัดก่อนแล้วค่อยแก้ไข" },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    name?: string;
    location?: string | null;
    status?: string;
  };

  const data: {
    code?: string;
    name?: string;
    location?: string | null;
    status?: string;
  } = {};

  if (body.code !== undefined) {
    const code = body.code.trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "รหัสสถานีว่างไม่ได้" }, { status: 400 });
    }
    if (!/^[A-Z0-9][A-Z0-9\-_]*$/.test(code)) {
      return NextResponse.json(
        { error: "รหัสสถานีใช้ได้เฉพาะตัวอักษร ตัวเลข - และ _" },
        { status: 400 },
      );
    }
    if (code !== station.code) {
      const clash = await prisma.station.findUnique({
        where: {
          tenantId_code: { tenantId: session.tenantId, code },
        },
      });
      if (clash) {
        return NextResponse.json({ error: "รหัสสถานีนี้มีอยู่แล้ว" }, { status: 409 });
      }
    }
    data.code = code;
  }

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "ชื่อสถานีว่างไม่ได้" }, { status: 400 });
    }
    data.name = name;
  }

  if (body.location !== undefined) {
    data.location = body.location?.trim() || null;
  }

  if (body.status !== undefined) {
    if (!(ALLOWED_STATUS as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่จะอัปเดต" }, { status: 400 });
  }

  const updated = await prisma.station.update({
    where: { id: station.id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "station.update",
      entityType: "station",
      entityId: station.id,
      meta: JSON.stringify(data),
    },
  });

  return NextResponse.json({ ok: true, station: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (!can(session.role, "stations.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการสถานี" }, { status: 403 });
  }

  const station = await prisma.station.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { _count: { select: { recordings: true } } },
  });

  if (!station) {
    return NextResponse.json({ error: "ไม่พบสถานี" }, { status: 404 });
  }

  const wasRecording = station.status === "recording";

  if (wasRecording) {
    await prisma.recording.updateMany({
      where: { stationId: station.id, status: "recording" },
      data: {
        status: "canceled",
        endedAt: new Date(),
        cancelReason: "station_deleted_while_recording",
      },
    });
  }

  const remaining = await prisma.recording.count({
    where: {
      stationId: station.id,
      status: { notIn: ["canceled", "deleted"] },
    },
  });

  if (remaining > 0) {
    if (wasRecording) {
      await prisma.station.update({
        where: { id: station.id },
        data: { status: "idle" },
      });
    }
    return NextResponse.json(
      {
        error: `ลบไม่ได้ เพราะมีวิดีโอบันทึก ${remaining} รายการ — เปลี่ยนสถานะเป็นบล็อกแทนได้`,
      },
      { status: 400 },
    );
  }

  // ลบรายการที่ถูกยกเลิก/ลบแล้วออกก่อน เพื่อให้ลบสถานีได้
  await prisma.recording.deleteMany({
    where: {
      stationId: station.id,
      status: { in: ["canceled", "deleted"] },
    },
  });

  await prisma.station.delete({ where: { id: station.id } });

  await syncUsageMeter(session.tenantId);

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "station.delete",
      entityType: "station",
      entityId: station.id,
      meta: JSON.stringify({
        code: station.code,
        name: station.name,
        wasRecording,
      }),
    },
  });

  return NextResponse.json({ ok: true, wasRecording });
}

import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refreshOnboardingState } from "@/lib/onboarding";
import {
  getUsageAndLimits,
  isStationLimitReached,
  syncUsageMeter,
} from "@/lib/tenant-limits";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const stations = await prisma.station.findMany({
    where: { tenantId: session.tenantId },
    include: {
      cameras: true,
      agent: true,
      _count: { select: { recordings: true } },
    },
    orderBy: { code: "asc" },
  });

  return NextResponse.json({ stations });
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

  if (!can(session.role, "stations.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการสถานี" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    name?: string;
    location?: string;
  };

  const code = body.code?.trim().toUpperCase();
  const name = body.name?.trim();
  const location = body.location?.trim() || null;

  if (!code || !name) {
    return NextResponse.json({ error: "กรุณาระบุรหัสและชื่อสถานี" }, { status: 400 });
  }

  if (!/^[A-Z0-9][A-Z0-9\-_]*$/.test(code)) {
    return NextResponse.json(
      { error: "รหัสสถานีใช้ได้เฉพาะตัวอักษร ตัวเลข - และ _" },
      { status: 400 },
    );
  }

  const existing = await prisma.station.findUnique({
    where: {
      tenantId_code: { tenantId: session.tenantId, code },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "รหัสสถานีนี้มีอยู่แล้ว" }, { status: 409 });
  }

  const { limits, usage } = await getUsageAndLimits(session.tenantId);
  if (!limits) {
    return NextResponse.json({ error: "ไม่พบแพ็กเกจขององค์กร" }, { status: 400 });
  }
  if (isStationLimitReached(usage, limits)) {
    return NextResponse.json(
      {
        error: `ถึงจำนวนสถานีสูงสุดแล้ว (${usage.stationsUsed}/${limits.maxStations})`,
      },
      { status: 400 },
    );
  }

  const station = await prisma.station.create({
    data: {
      tenantId: session.tenantId,
      code,
      name,
      location,
      status: "disabled",
      agent: {
        create: {
          tenantId: session.tenantId,
          version: "web",
          lastHeartbeatAt: new Date(),
          online: true,
          queueSize: 0,
        },
      },
    },
    include: { agent: true },
  });

  await syncUsageMeter(session.tenantId);
  await refreshOnboardingState(session.tenantId);

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "station.create",
      entityType: "station",
      entityId: station.id,
      meta: JSON.stringify({ code, name }),
    },
  });

  return NextResponse.json({ ok: true, station }, { status: 201 });
}

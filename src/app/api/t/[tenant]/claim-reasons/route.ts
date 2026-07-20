import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const reasons = await prisma.claimReason.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return NextResponse.json({ reasons });
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

  if (!can(session.role, "claim_reasons.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการเหตุผลเคลม" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    label?: string;
    sortOrder?: number;
  };

  const label = body.label?.trim();
  if (!label) {
    return NextResponse.json({ error: "กรุณาระบุเหตุผลเคลม" }, { status: 400 });
  }

  const existing = await prisma.claimReason.findUnique({
    where: {
      tenantId_label: { tenantId: session.tenantId, label },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "เหตุผลนี้มีอยู่แล้ว" }, { status: 409 });
  }

  const maxSort = await prisma.claimReason.aggregate({
    where: { tenantId: session.tenantId },
    _max: { sortOrder: true },
  });

  const reason = await prisma.claimReason.create({
    data: {
      tenantId: session.tenantId,
      label,
      active: true,
      sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "claim_reason.create",
      entityType: "claim_reason",
      entityId: reason.id,
      meta: JSON.stringify({ label }),
    },
  });

  return NextResponse.json({ ok: true, reason }, { status: 201 });
}

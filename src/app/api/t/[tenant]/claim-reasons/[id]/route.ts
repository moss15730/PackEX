import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { denyIfReadOnly } from "@/lib/tenant-access";

export async function PATCH(
  req: Request,
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

  if (!can(session.role, "claim_reasons.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการเหตุผลเคลม" }, { status: 403 });
  }

  const reason = await prisma.claimReason.findFirst({
    where: { id, tenantId: session.tenantId },
  });

  if (!reason) {
    return NextResponse.json({ error: "ไม่พบเหตุผลเคลม" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    label?: string;
    active?: boolean;
    sortOrder?: number;
  };

  const data: { label?: string; active?: boolean; sortOrder?: number } = {};

  if (body.label !== undefined) {
    const label = body.label.trim();
    if (!label) {
      return NextResponse.json({ error: "เหตุผลเคลมว่างไม่ได้" }, { status: 400 });
    }
    if (label !== reason.label) {
      const clash = await prisma.claimReason.findUnique({
        where: {
          tenantId_label: { tenantId: session.tenantId, label },
        },
      });
      if (clash) {
        return NextResponse.json({ error: "เหตุผลนี้มีอยู่แล้ว" }, { status: 409 });
      }
    }
    data.label = label;
  }

  if (body.active !== undefined) data.active = body.active;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่จะอัปเดต" }, { status: 400 });
  }

  const updated = await prisma.claimReason.update({
    where: { id: reason.id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "claim_reason.update",
      entityType: "claim_reason",
      entityId: reason.id,
      meta: JSON.stringify(data),
    },
  });

  return NextResponse.json({ ok: true, reason: updated });
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

  const denied = await denyIfReadOnly(session.tenantId);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  if (!can(session.role, "claim_reasons.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการเหตุผลเคลม" }, { status: 403 });
  }

  const reason = await prisma.claimReason.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { _count: { select: { cases: true } } },
  });

  if (!reason) {
    return NextResponse.json({ error: "ไม่พบเหตุผลเคลม" }, { status: 404 });
  }

  if (reason._count.cases > 0) {
    // มีเคสใช้แล้ว — ปิดการใช้งานแทนการลบ เพื่อเก็บประวัติ
    const updated = await prisma.claimReason.update({
      where: { id: reason.id },
      data: { active: false },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: "claim_reason.deactivate",
        entityType: "claim_reason",
        entityId: reason.id,
        meta: JSON.stringify({ label: reason.label, cases: reason._count.cases }),
      },
    });

    return NextResponse.json({
      ok: true,
      deactivated: true,
      reason: updated,
      message: `มีเคสใช้เหตุผลนี้อยู่ ${reason._count.cases} รายการ — ปิดการใช้งานแทนการลบ`,
    });
  }

  await prisma.claimReason.delete({ where: { id: reason.id } });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "claim_reason.delete",
      entityType: "claim_reason",
      entityId: reason.id,
      meta: JSON.stringify({ label: reason.label }),
    },
  });

  return NextResponse.json({ ok: true, deleted: true });
}

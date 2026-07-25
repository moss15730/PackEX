import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { denyIfReadOnly } from "@/lib/tenant-access";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const denied = await denyIfReadOnly(session.tenantId);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  if (!can(session.role, "claims.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการเคสเคลม" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    orderNo?: string;
    reasonId?: string;
    reason?: string;
    recordingIds?: string[];
  };

  const orderNo = body.orderNo?.trim();
  const reasonId = body.reasonId?.trim();
  const recordingIds = Array.isArray(body.recordingIds)
    ? [...new Set(body.recordingIds.filter(Boolean))]
    : [];

  if (!orderNo) {
    return NextResponse.json({ error: "กรุณาระบุเลขออเดอร์" }, { status: 400 });
  }
  if (!reasonId) {
    return NextResponse.json({ error: "กรุณาเลือกเหตุผลเคลม" }, { status: 400 });
  }
  if (recordingIds.length === 0) {
    return NextResponse.json(
      { error: "กรุณาแนบวิดีโอหลักฐานอย่างน้อย 1 รายการ" },
      { status: 400 },
    );
  }

  const tenantId = session.tenantId;

  const claimReason = await prisma.claimReason.findFirst({
    where: { id: reasonId, tenantId, active: true },
  });

  if (!claimReason) {
    return NextResponse.json(
      { error: "ไม่พบเหตุผลเคลม หรือถูกปิดใช้งานแล้ว" },
      { status: 400 },
    );
  }

  const reason = claimReason.label;

  const order = await prisma.order.findUnique({
    where: { tenantId_orderNo: { tenantId, orderNo } },
  });

  if (!order) {
    return NextResponse.json(
      { error: "ไม่พบออเดอร์นี้ — ตรวจเลขหรืออัดวิดีโอออเดอร์นี้ก่อน" },
      { status: 404 },
    );
  }

  const recordings = await prisma.recording.findMany({
    where: {
      id: { in: recordingIds },
      tenantId,
      orderId: order.id,
      status: { notIn: ["deleted", "canceled"] },
    },
  });

  if (recordings.length !== recordingIds.length) {
    return NextResponse.json(
      { error: "วิดีโอหลักฐานบางรายการไม่พบ หรือไม่ใช่ของออเดอร์นี้" },
      { status: 400 },
    );
  }

  const claim = await prisma.$transaction(async (tx) => {
    const created = await tx.claimCase.create({
      data: {
        tenantId,
        orderId: order.id,
        reason,
        reasonId: claimReason.id,
        status: "open",
        packages: {
          create: recordings.map((rec) => ({
            recordingId: rec.id,
            exportPath: null,
          })),
        },
      },
      include: {
        order: true,
        packages: { include: { recording: true } },
      },
    });

    await tx.recording.updateMany({
      where: { id: { in: recordingIds } },
      data: { legalHold: true },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "claimed" },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.id,
        action: "claim.create",
        entityType: "claim_case",
        entityId: created.id,
        meta: JSON.stringify({ orderNo, recordingIds }),
      },
    });

    return created;
  });

  return NextResponse.json({ ok: true, claim }, { status: 201 });
}

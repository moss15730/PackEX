import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_STATUS = ["open", "reviewing", "closed"] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (!can(session.role, "claims.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการเคสเคลม" }, { status: 403 });
  }

  const claim = await prisma.claimCase.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      packages: true,
      order: true,
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "ไม่พบเคสเคลม" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    releaseLegalHold?: boolean;
  };

  if (!body.status || !(ALLOWED_STATUS as readonly string[]).includes(body.status)) {
    return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
  }

  const nextStatus = body.status as (typeof ALLOWED_STATUS)[number];
  const releaseLegalHold = Boolean(body.releaseLegalHold) && nextStatus === "closed";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.claimCase.update({
      where: { id: claim.id },
      data: { status: nextStatus },
      include: {
        order: true,
        packages: { include: { recording: true } },
      },
    });

    if (releaseLegalHold && claim.packages.length > 0) {
      await tx.recording.updateMany({
        where: { id: { in: claim.packages.map((p) => p.recordingId) } },
        data: { legalHold: false },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: session.tenantId!,
        userId: session.id,
        action: nextStatus === "closed" ? "claim.close" : "claim.update",
        entityType: "claim_case",
        entityId: claim.id,
        meta: JSON.stringify({
          from: claim.status,
          to: nextStatus,
          releaseLegalHold,
          orderNo: claim.order.orderNo,
        }),
      },
    });

    return result;
  });

  return NextResponse.json({
    ok: true,
    claim: updated,
    legalHoldReleased: releaseLegalHold,
  });
}

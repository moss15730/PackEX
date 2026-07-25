import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { DATA_REQUEST_TYPES, type DataRequestType } from "@/lib/data-requests";

/** Tenant admins raise PDPA export/deletion requests from settings. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  if (session.role !== "tenant_admin") {
    return NextResponse.json(
      { error: "เฉพาะผู้ดูแลองค์กรเท่านั้นที่ยื่นคำขอได้" },
      { status: 403 },
    );
  }

  const limited = rateLimit({
    key: `data-request:${session.tenantId}:${clientIp(req)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `ยื่นคำขอถี่เกินไป ลองใหม่ใน ${limited.retryAfterSec} วินาที` },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { type?: string };
  const type = body.type as DataRequestType | undefined;

  if (!type || !DATA_REQUEST_TYPES.includes(type)) {
    return NextResponse.json({ error: "ประเภทคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  const duplicate = await prisma.dataRequest.findFirst({
    where: { tenantId: session.tenantId, type, status: { in: ["pending", "processing"] } },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "มีคำขอประเภทนี้ที่ยังดำเนินการอยู่แล้ว" },
      { status: 409 },
    );
  }

  const request = await prisma.dataRequest.create({
    data: { tenantId: session.tenantId, type, status: "pending" },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "data_request.create",
      entityType: "data_request",
      entityId: request.id,
      meta: JSON.stringify({ type }),
    },
  });

  return NextResponse.json({ ok: true, request }, { status: 201 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const requests = await prisma.dataRequest.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DATA_REQUEST_STATUSES, type DataRequestStatus } from "@/lib/data-requests";

/** Platform admins move a PDPA request through its lifecycle. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = body.status as DataRequestStatus | undefined;

  if (!status || !DATA_REQUEST_STATUSES.includes(status)) {
    return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
  }

  const existing = await prisma.dataRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 });
  }

  const updated = await prisma.dataRequest.update({ where: { id }, data: { status } });

  await prisma.auditLog.create({
    data: {
      tenantId: existing.tenantId,
      action: "data_request.status",
      entityType: "data_request",
      entityId: id,
      meta: JSON.stringify({ from: existing.status, to: status, by: session.email }),
    },
  });

  return NextResponse.json({ ok: true, request: updated });
}

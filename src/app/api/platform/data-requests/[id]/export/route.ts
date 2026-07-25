import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildTenantDataExport } from "@/lib/data-requests";
import { format } from "date-fns";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Produces the real PDPA export payload for a request. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  const { id } = await params;
  const request = await prisma.dataRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: request.tenantId },
    select: { slug: true },
  });
  if (!tenant) return NextResponse.json({ error: "ไม่พบองค์กร" }, { status: 404 });

  const payload = await buildTenantDataExport(request.tenantId);

  await prisma.auditLog.create({
    data: {
      tenantId: request.tenantId,
      action: "data_request.export_downloaded",
      entityType: "data_request",
      entityId: id,
      meta: JSON.stringify({ by: session.email, counts: payload.counts }),
    },
  });

  const filename = `packex-export-${tenant.slug}-${format(new Date(), "yyyy-MM-dd")}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

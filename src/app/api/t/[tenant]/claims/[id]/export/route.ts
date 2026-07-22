import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildClaimPackageZip } from "@/lib/claim-package";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (!can(session.role, "claims.manage") && !can(session.role, "video.download")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดาวน์โหลด Claim Package" }, { status: 403 });
  }

  const built = await buildClaimPackageZip({
    tenantId: session.tenantId,
    claimId: id,
  });

  if (!built) {
    return NextResponse.json({ error: "ไม่พบเคสเคลม" }, { status: 404 });
  }

  await prisma.claimPackage.updateMany({
    where: { claimCaseId: id },
    data: {
      exportPath: `/api/t/${tenantSlug}/claims/${id}/export`,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "claim.export",
      entityType: "claim_case",
      entityId: id,
      meta: JSON.stringify({ filename: built.filename, bytes: built.data.byteLength }),
    },
  });

  return new NextResponse(Buffer.from(built.data), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${built.filename}"`,
      "Content-Length": String(built.data.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

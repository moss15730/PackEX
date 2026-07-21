import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const alert = await prisma.alert.findFirst({
    where: { id, tenantId: session.tenantId },
  });

  if (!alert) {
    return NextResponse.json({ error: "ไม่พบแจ้งเตือน" }, { status: 404 });
  }

  await prisma.alert.update({
    where: { id },
    data: { acknowledged: true },
  });

  return NextResponse.json({ ok: true });
}

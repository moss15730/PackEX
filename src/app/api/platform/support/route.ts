import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  const grants = await prisma.supportAccessGrant.findMany({
    include: { tenant: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ grants });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    tenantSlug?: string;
    reason?: string;
    grantedTo?: string;
    expiresInHours?: number;
  };

  const tenantSlug = body.tenantSlug?.trim().toLowerCase();
  const reason = body.reason?.trim();
  const grantedTo = body.grantedTo?.trim();
  const hours = Number(body.expiresInHours || 24);

  if (!tenantSlug || !reason || !grantedTo) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "ไม่พบ tenant" }, { status: 404 });
  }

  const grant = await prisma.supportAccessGrant.create({
    data: {
      tenantId: tenant.id,
      reason,
      grantedTo,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    },
    include: { tenant: { select: { slug: true, name: true } } },
  });

  return NextResponse.json({ ok: true, grant }, { status: 201 });
}

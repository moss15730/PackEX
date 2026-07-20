import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (!can(session.role, "video.share")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์แชร์วิดีโอ" }, { status: 403 });
  }

  const recording = await prisma.recording.findFirst({
    where: {
      id,
      tenantId: session.tenantId,
      status: { not: "deleted" },
    },
  });

  if (!recording) {
    return NextResponse.json({ error: "ไม่พบวิดีโอ" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    expiresInDays?: number;
    maxOpens?: number | null;
  };

  const expiresInDays = Math.min(Math.max(body.expiresInDays ?? 30, 1), 365);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const token = randomBytes(24).toString("base64url");

  const link = await prisma.shareLink.create({
    data: {
      tenantId: session.tenantId,
      recordingId: recording.id,
      token,
      expiresAt,
      maxOpens: body.maxOpens ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "share_link.create",
      entityType: "share_link",
      entityId: link.id,
      meta: JSON.stringify({ recordingId: recording.id }),
    },
  });

  return NextResponse.json({
    ok: true,
    token: link.token,
    path: `/share/${link.token}`,
    expiresAt: link.expiresAt.toISOString(),
    maxOpens: link.maxOpens,
  });
}

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { can, hashPassword, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (session.supportGrantId) {
    return NextResponse.json(
      { error: "บัญชี Support ไม่สามารถสร้างลิงก์แชร์ได้" },
      { status: 403 },
    );
  }

  if (!can(session.role, "video.share")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์แชร์วิดีโอ" }, { status: 403 });
  }

  const limited = rateLimit({
    key: `share-create:${session.tenantId}:${session.id}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `สร้างลิงก์บ่อยเกินไป — รอ ${limited.retryAfterSec} วินาที` },
      { status: 429 },
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { subscription: { include: { plan: true } } },
  });

  if (!tenant?.subscription?.plan?.allowShareLink) {
    return NextResponse.json(
      { error: "แพ็กเกจนี้ไม่รองรับการแชร์ลิงก์ — อัปเกรดเป็น Business ขึ้นไป" },
      { status: 403 },
    );
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
    password?: string | null;
  };

  const expiresInDays = Math.min(Math.max(body.expiresInDays ?? 30, 1), 365);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const password = body.password?.trim() || "";
  if (password && password.length < 4) {
    return NextResponse.json(
      { error: "รหัสผ่านลิงก์ต้องมีอย่างน้อย 4 ตัวอักษร" },
      { status: 400 },
    );
  }

  const token = randomBytes(24).toString("base64url");
  const passwordHash = password ? await hashPassword(password) : null;

  const link = await prisma.shareLink.create({
    data: {
      tenantId: session.tenantId,
      recordingId: recording.id,
      token,
      expiresAt,
      maxOpens: body.maxOpens ?? null,
      passwordHash,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "share_link.create",
      entityType: "share_link",
      entityId: link.id,
      meta: JSON.stringify({
        recordingId: recording.id,
        passwordProtected: Boolean(passwordHash),
        ip: clientIp(req),
      }),
    },
  });

  return NextResponse.json({
    ok: true,
    token: link.token,
    path: `/share/${link.token}`,
    expiresAt: link.expiresAt.toISOString(),
    maxOpens: link.maxOpens,
    passwordProtected: Boolean(passwordHash),
  });
}

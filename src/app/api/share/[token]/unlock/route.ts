import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  createShareUnlockToken,
  shareUnlockCookieName,
} from "@/lib/share-access";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ip = clientIp(req);
  const limited = rateLimit({
    key: `share-unlock:${ip}:${token}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `ลองบ่อยเกินไป — รอ ${limited.retryAfterSec} วินาที` },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = body.password ?? "";

  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link || !link.passwordHash) {
    return NextResponse.json({ error: "ไม่พบลิงก์" }, { status: 404 });
  }

  const ok = await verifyPassword(password, link.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const unlock = await createShareUnlockToken(token);
  const cookieStore = await cookies();
  cookieStore.set(shareUnlockCookieName(token), unlock, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/share/${token}`,
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { isMailConfigured, passwordResetEmail, sendMail } from "@/lib/mailer";
import {
  RESET_TOKEN_TTL_MINUTES,
  createResetToken,
  findResetSubject,
} from "@/lib/password-reset";

export const runtime = "nodejs";

function appOrigin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

/**
 * Requests a reset link.
 *
 * Always answers 200 with the same message whether or not the address exists —
 * the endpoint must not become an account-enumeration oracle.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);

  const limited = await checkRateLimit({
    key: `password-reset-ip:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `ขอรีเซ็ตบ่อยเกินไป — รอ ${limited.retryAfterSec} วินาที` },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";

  const genericResponse = NextResponse.json({
    ok: true,
    message: "ถ้าอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านให้แล้ว",
  });

  if (!email || !email.includes("@")) return genericResponse;

  await checkRateLimit({
    key: `password-reset-email:${email}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });

  const subject = await findResetSubject(email);
  if (!subject) return genericResponse;

  const { token } = await createResetToken(subject, ip);
  const resetUrl = `${appOrigin(req)}/reset-password?token=${token}`;

  const message = passwordResetEmail(resetUrl, RESET_TOKEN_TTL_MINUTES);
  const delivery = await sendMail({ ...message, to: subject.email });

  if (!delivery.delivered) {
    // No mail provider (or it failed): keep an audit trail so a platform admin
    // can hand the link over after verifying identity out-of-band.
    console.warn(
      `[password-reset] link not emailed (${delivery.reason}) for ${subject.email} — deliver manually`,
    );
    if (subject.kind === "user") {
      const user = await prisma.user.findUnique({
        where: { id: subject.id },
        select: { tenantId: true },
      });
      if (user) {
        await prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: subject.id,
            action: "auth.password_reset_requested",
            entityType: "user",
            entityId: subject.id,
            meta: JSON.stringify({ delivered: false, reason: delivery.reason, ip }),
          },
        });
      }
    } else {
      await prisma.auditLog.create({
        data: {
          action: "auth.password_reset_requested",
          entityType: "platform_admin",
          entityId: subject.id,
          meta: JSON.stringify({ delivered: false, reason: delivery.reason, ip }),
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "ถ้าอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านให้แล้ว",
    // Surfaced only so the UI can warn the operator during setup.
    mailConfigured: isMailConfigured(),
  });
}

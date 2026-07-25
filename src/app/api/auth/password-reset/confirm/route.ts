import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import {
  consumeResetToken,
  validatePasswordStrength,
  verifyResetToken,
} from "@/lib/password-reset";

export const runtime = "nodejs";

const REASON_MESSAGES: Record<string, string> = {
  invalid: "ลิงก์รีเซ็ตไม่ถูกต้อง",
  expired: "ลิงก์รีเซ็ตหมดอายุแล้ว — กรุณาขอลิงก์ใหม่",
  used: "ลิงก์นี้ถูกใช้ไปแล้ว — กรุณาขอลิงก์ใหม่",
};

/** Validates a token without consuming it, so the form can fail fast. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const lookup = await verifyResetToken(token);

  if (!lookup.ok) {
    return NextResponse.json(
      { ok: false, error: REASON_MESSAGES[lookup.reason] ?? "ลิงก์ไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, email: lookup.record.email });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = await checkRateLimit({
    key: `password-reset-confirm:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `ลองบ่อยเกินไป — รอ ${limited.retryAfterSec} วินาที` },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    password?: string;
  };

  const token = body.token?.trim() ?? "";
  const password = body.password ?? "";

  const weakness = validatePasswordStrength(password);
  if (weakness) {
    return NextResponse.json({ ok: false, error: weakness }, { status: 400 });
  }

  const lookup = await verifyResetToken(token);
  if (!lookup.ok) {
    return NextResponse.json(
      { ok: false, error: REASON_MESSAGES[lookup.reason] ?? "ลิงก์ไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  try {
    await consumeResetToken(
      lookup.record.id,
      lookup.record.subjectKind,
      lookup.record.subjectId,
      password,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_ALREADY_USED") {
      return NextResponse.json({ ok: false, error: REASON_MESSAGES.used }, { status: 409 });
    }
    console.error("[password-reset] confirm failed", error);
    return NextResponse.json(
      { ok: false, error: "ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    redirect: lookup.record.subjectKind === "platform" ? "/login?platform=1" : "/login",
  });
}

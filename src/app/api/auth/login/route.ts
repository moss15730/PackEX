import { NextResponse } from "next/server";
import { loginPlatform, loginTenantByEmail } from "@/lib/auth";
import { assertProductionReady } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    assertProductionReady();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured";
    console.error("[login]", message);
    return NextResponse.json(
      { ok: false, error: "ระบบยังตั้งค่า production ไม่ครบ — ติดต่อผู้ดูแล" },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const limited = rateLimit({
    key: `login:${ip}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `ลองเข้าสู่ระบบบ่อยเกินไป — รอ ${limited.retryAfterSec} วินาที` },
      { status: 429 },
    );
  }

  const body = await req.json();
  const { email, password, platform } = body as {
    email?: string;
    password?: string;
    platform?: boolean;
  };

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 });
  }

  if (platform) {
    const result = await loginPlatform(email, password);
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }
    return NextResponse.json({ ok: true, redirect: "/platform" });
  }

  const result = await loginTenantByEmail(email, password);
  if ("error" in result) {
    const message = result.error ?? "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    if (message.includes("ระงับ")) {
      return NextResponse.json({ ok: false, error: message, redirect: "/suspended" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    redirect: `/t/${result.tenant.slug}/dashboard`,
  });
}

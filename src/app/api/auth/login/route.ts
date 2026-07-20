import { NextResponse } from "next/server";
import { loginPlatform, loginTenantByEmail } from "@/lib/auth";

export async function POST(req: Request) {
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

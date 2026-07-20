import { NextResponse } from "next/server";
import { loginPlatform, loginTenant } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, tenantSlug, platform } = body as {
    email?: string;
    password?: string;
    tenantSlug?: string;
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

  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: "กรุณาระบุ tenant slug" }, { status: 400 });
  }

  const result = await loginTenant(email, password, tenantSlug);
  if ("error" in result) {
    if (result.error?.includes("ระงับ")) {
      return NextResponse.json({ ok: false, error: result.error, redirect: "/suspended" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    redirect: `/t/${result.tenant.slug}/dashboard`,
  });
}

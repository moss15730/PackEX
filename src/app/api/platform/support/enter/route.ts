import { NextResponse } from "next/server";
import {
  enterTenantWithSupportGrant,
  requirePlatformSession,
} from "@/lib/auth";

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (!session) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { tenantSlug?: string };
  const tenantSlug = body.tenantSlug?.trim().toLowerCase();
  if (!tenantSlug) {
    return NextResponse.json({ error: "กรุณาระบุ tenantSlug" }, { status: 400 });
  }

  const result = await enterTenantWithSupportGrant({
    platformSession: session,
    tenantSlug,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    redirect: `/t/${result.tenant.slug}/videos`,
    grantId: result.grantId,
  });
}

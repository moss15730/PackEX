import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markOnboardingStep } from "@/lib/onboarding";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (!can(session.role, "employees.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขข้อมูลองค์กร" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    locale?: string;
    timezone?: string;
  };

  const name = body.name?.trim();
  const locale = body.locale?.trim();
  const timezone = body.timezone?.trim();

  if (!name) {
    return NextResponse.json({ error: "กรุณาระบุชื่อองค์กร" }, { status: 400 });
  }

  const validLocales = ["th", "en", "zh"];
  const validTimezones = ["Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "UTC"];

  if (locale && !validLocales.includes(locale)) {
    return NextResponse.json({ error: "ภาษาไม่รองรับ" }, { status: 400 });
  }
  if (timezone && !validTimezones.includes(timezone)) {
    return NextResponse.json({ error: "Timezone ไม่รองรับ" }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      name,
      ...(locale ? { locale } : {}),
      ...(timezone ? { timezone } : {}),
    },
    select: { id: true, name: true, slug: true, locale: true, timezone: true, status: true },
  });

  await markOnboardingStep(session.tenantId, "localeSet");

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "organization.update",
      entityType: "tenant",
      entityId: tenant.id,
      meta: JSON.stringify({ name, locale, timezone }),
    },
  });

  return NextResponse.json({ ok: true, tenant });
}

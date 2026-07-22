import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markOnboardingStep } from "@/lib/onboarding";

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

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
    overlayEnabled?: boolean;
    snapshotRequired?: boolean;
    minRecordingSeconds?: number;
    minCameras?: number;
    idleAutoStopMinutes?: number;
    softDeleteDays?: number;
    videoPreset?: string;
    consentRequired?: boolean;
  };

  const name = body.name?.trim();
  const locale = body.locale?.trim();
  const timezone = body.timezone?.trim();

  if (!name) {
    return NextResponse.json({ error: "กรุณาระบุชื่อองค์กร" }, { status: 400 });
  }

  const validLocales = ["th", "en", "zh"];
  const validTimezones = ["Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "UTC"];
  const validPresets = ["economy", "standard", "high"];

  if (locale && !validLocales.includes(locale)) {
    return NextResponse.json({ error: "ภาษาไม่รองรับ" }, { status: 400 });
  }
  if (timezone && !validTimezones.includes(timezone)) {
    return NextResponse.json({ error: "Timezone ไม่รองรับ" }, { status: 400 });
  }
  if (body.videoPreset && !validPresets.includes(body.videoPreset)) {
    return NextResponse.json({ error: "preset วิดีโอไม่รองรับ" }, { status: 400 });
  }

  const settingsData = {
    overlayEnabled: body.overlayEnabled ?? true,
    snapshotRequired: body.snapshotRequired ?? true,
    minRecordingSeconds: clampInt(body.minRecordingSeconds, 5, 600, 15),
    minCameras: clampInt(body.minCameras, 1, 8, 1),
    idleAutoStopMinutes: clampInt(body.idleAutoStopMinutes, 1, 120, 10),
    softDeleteDays: clampInt(body.softDeleteDays, 1, 365, 14),
    videoPreset: body.videoPreset || "standard",
    consentRequired: body.consentRequired ?? true,
  };

  const tenant = await prisma.$transaction(async (tx) => {
    const updated = await tx.tenant.update({
      where: { id: session.tenantId },
      data: {
        name,
        ...(locale ? { locale } : {}),
        ...(timezone ? { timezone } : {}),
      },
      select: { id: true, name: true, slug: true, locale: true, timezone: true, status: true },
    });

    await tx.tenantSettings.upsert({
      where: { tenantId: session.tenantId },
      update: settingsData,
      create: { tenantId: session.tenantId!, ...settingsData },
    });

    return updated;
  });

  await markOnboardingStep(session.tenantId, "localeSet");

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "organization.update",
      entityType: "tenant",
      entityId: tenant.id,
      meta: JSON.stringify({ name, locale, timezone, ...settingsData }),
    },
  });

  return NextResponse.json({ ok: true, tenant, settings: settingsData });
}

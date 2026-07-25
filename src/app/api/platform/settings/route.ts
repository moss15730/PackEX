import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/platform-settings";

export async function GET() {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  return NextResponse.json({ settings: await getPlatformSettings() });
}

/** Optional numeric field: "" / null clears the override, otherwise validate. */
function optionalPositiveInt(value: unknown, max: number): number | null | undefined {
  if (value === null || value === "") return null;
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > max) return undefined;
  return Math.round(parsed);
}

export async function PATCH(req: Request) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const trialDays = Number(body.trialDays);
  if (!Number.isFinite(trialDays) || trialDays < 1 || trialDays > 365) {
    return NextResponse.json({ error: "จำนวนวันทดลองต้องอยู่ระหว่าง 1–365" }, { status: 400 });
  }

  const trialPlanId = typeof body.trialPlanId === "string" && body.trialPlanId ? body.trialPlanId : null;
  if (trialPlanId) {
    const plan = await prisma.plan.findUnique({ where: { id: trialPlanId }, select: { id: true } });
    if (!plan) return NextResponse.json({ error: "ไม่พบแผนที่เลือก" }, { status: 400 });
  }

  const stations = optionalPositiveInt(body.trialMaxStations, 100);
  const storage = optionalPositiveInt(body.trialMaxStorageGb, 10_000);
  const users = optionalPositiveInt(body.trialMaxUsers, 500);

  if (stations === undefined || storage === undefined || users === undefined) {
    return NextResponse.json({ error: "โควต้าทดลองใช้ไม่ถูกต้อง" }, { status: 400 });
  }

  const settings = await updatePlatformSettings(
    {
      signupEnabled: body.signupEnabled !== false,
      trialPlanId,
      trialDays: Math.round(trialDays),
      trialMaxStations: stations,
      trialMaxStorageGb: storage,
      trialMaxUsers: users,
      trialNotice:
        typeof body.trialNotice === "string" && body.trialNotice.trim()
          ? body.trialNotice.trim().slice(0, 500)
          : null,
    },
    session.email,
  );

  await prisma.auditLog.create({
    data: {
      action: "platform.settings_updated",
      entityType: "platform_settings",
      meta: JSON.stringify({ by: session.email, trialDays: settings.trialDays }),
    },
  });

  return NextResponse.json({ ok: true, settings });
}

import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { validatePasswordStrength } from "@/lib/password-reset";
import {
  getPlatformSettings,
  resolveTrialPlan,
  validateSlug,
} from "@/lib/platform-settings";
import { postMessage } from "@/lib/support-chat";
import { addDays } from "date-fns";

export const runtime = "nodejs";

/**
 * Self-serve trial signup.
 *
 * Creates the organisation, its settings, a trial subscription and the first
 * tenant admin in one transaction — a half-created tenant would leave someone
 * unable to log in with no way to retry the same slug.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);

  const limited = await checkRateLimit({
    key: `signup:${ip}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `สมัครถี่เกินไป — ลองใหม่ใน ${Math.ceil(limited.retryAfterSec / 60)} นาที` },
      { status: 429 },
    );
  }

  const policy = await getPlatformSettings();
  if (!policy.signupEnabled) {
    return NextResponse.json(
      { error: "ขณะนี้ปิดรับสมัครทดลองใช้ กรุณาติดต่อทีมงาน" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    organizationName?: string;
    slug?: string;
    adminName?: string;
    email?: string;
    password?: string;
    phone?: string;
  };

  const organizationName = body.organizationName?.trim();
  const adminName = body.adminName?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!organizationName || !adminName || !email || !body.slug) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" }, { status: 400 });
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
  }

  const slugCheck = validateSlug(body.slug);
  if (!slugCheck.ok) {
    return NextResponse.json({ error: slugCheck.error }, { status: 400 });
  }
  const slug = slugCheck.slug;

  const weakness = validatePasswordStrength(password);
  if (weakness) {
    return NextResponse.json({ error: weakness }, { status: 400 });
  }

  const [slugTaken, emailTaken, adminEmailTaken] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.platformAdmin.findUnique({ where: { email }, select: { id: true } }),
  ]);

  if (slugTaken) {
    return NextResponse.json({ error: "ชื่อ URL นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น" }, { status: 409 });
  }
  if (emailTaken || adminEmailTaken) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
  }

  const plan = await resolveTrialPlan(policy);
  if (!plan) {
    return NextResponse.json(
      { error: "ระบบยังไม่ได้ตั้งค่าแผนบริการ กรุณาติดต่อทีมงาน" },
      { status: 503 },
    );
  }

  const trialEndsAt = addDays(new Date(), Math.max(1, policy.trialDays));
  const passwordHash = await hashPassword(password);

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        slug,
        name: organizationName,
        status: "trial",
        settings: {
          create: {
            // Trial quotas are stored as per-tenant overrides so admins can
            // lift them later without touching the shared plan.
            maxStationsOverride: policy.trialMaxStations,
            maxStorageGbOverride: policy.trialMaxStorageGb,
            maxUsersOverride: policy.trialMaxUsers,
          },
        },
        subscription: {
          create: {
            planId: plan.id,
            status: "trialing",
            trialEndsAt,
          },
        },
        onboarding: { create: {} },
        usageMeters: { create: {} },
      },
      select: { id: true, slug: true, name: true },
    });

    await tx.user.create({
      data: {
        tenantId: created.id,
        email,
        employeeCode: "EMP-001",
        name: adminName,
        passwordHash,
        role: "tenant_admin",
        status: "active",
        stationAccess: "*",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: created.id,
        action: "tenant.self_signup",
        entityType: "tenant",
        entityId: created.id,
        meta: JSON.stringify({
          slug,
          plan: plan.code,
          trialDays: policy.trialDays,
          trialEndsAt: trialEndsAt.toISOString(),
          ip,
        }),
      },
    });

    return created;
  });

  // Opens the support thread so the organisation has somewhere to ask for an
  // extension the moment the trial runs out.
  await postMessage({
    tenantId: tenant.id,
    senderKind: "platform",
    senderName: "PackEX",
    body: [
      `ยินดีต้อนรับ ${tenant.name} 👋`,
      "",
      `คุณกำลังทดลองใช้แผน ${plan.nameTh} เป็นเวลา ${policy.trialDays} วัน`,
      policy.trialNotice ?? "หากต้องการต่ออายุหรือเพิ่มความจุ ทักมาที่แชทนี้ได้เลย",
    ].join("\n"),
  }).catch(() => undefined);

  return NextResponse.json(
    {
      ok: true,
      tenant: { slug: tenant.slug, name: tenant.name },
      trial: {
        planName: plan.nameTh,
        days: policy.trialDays,
        endsAt: trialEndsAt.toISOString(),
        maxStations: policy.trialMaxStations ?? plan.maxStations,
        maxStorageGb: policy.trialMaxStorageGb ?? plan.maxStorageGb,
        maxUsers: policy.trialMaxUsers ?? plan.maxUsers,
      },
      redirect: "/login",
    },
    { status: 201 },
  );
}

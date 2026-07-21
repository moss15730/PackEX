import { NextResponse } from "next/server";
import { hashPassword, requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncUsageMeter } from "@/lib/tenant-limits";

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function normalizeEmployeeCode(code: string) {
  return code.trim().toUpperCase();
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการ Tenants" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    name?: string;
    planId?: string;
    tenantAdmin?: {
      name?: string;
      employeeCode?: string;
      email?: string;
      password?: string;
    };
    // future: stationAccess
  };

  const slug = body.slug ? normalizeSlug(body.slug) : "";
  const name = body.name?.trim() || "";
  const planId = body.planId ? String(body.planId) : "";
  const admin = body.tenantAdmin ?? {};

  const adminName = admin.name?.trim() || "";
  const employeeCode = admin.employeeCode ? normalizeEmployeeCode(admin.employeeCode) : "";
  const email = admin.email?.trim().toLowerCase() || "";
  const password = admin.password ? String(admin.password) : "";

  if (!slug || !name || !planId) {
    return NextResponse.json({ error: "กรุณาระบุ slug, ชื่อองค์กร และ plan" }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9\-_]*$/.test(slug)) {
    return NextResponse.json({ error: "slug ใช้ได้เฉพาะ a-z, 0-9, - และ _" }, { status: 400 });
  }
  if (!adminName || !employeeCode || !email || !password) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูล Tenant Admin ให้ครบ" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  }
  if (!/^[A-Z0-9][A-Z0-9\-_]*$/.test(employeeCode)) {
    return NextResponse.json(
      { error: "รหัสพนักงานใช้ได้เฉพาะตัวอักษร ตัวเลข - และ _" },
      { status: 400 },
    );
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json({ error: "ไม่พบแผนราคา" }, { status: 404 });
  }
  if (plan.maxUsers < 1) {
    return NextResponse.json({ error: "แผนนี้ไม่รองรับผู้ใช้" }, { status: 400 });
  }

  const [tenantClash, emailClash] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  if (tenantClash) {
    return NextResponse.json({ error: "slug นี้ถูกใช้งานแล้ว" }, { status: 409 });
  }
  if (emailClash) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        slug,
        name,
        status: "active",
      },
    });

    await tx.subscription.create({
      data: {
        tenantId: created.id,
        planId,
        status: "active",
        currentPeriodEnd,
      },
    });

    // Initialize usage meter (capacity enforcement uses it).
    await tx.usageMeter.create({
      data: {
        tenantId: created.id,
        stationsUsed: 0,
        storageUsedGb: 0,
        usersUsed: 1,
      },
    });

    await tx.tenantSettings.create({
      data: {
        tenantId: created.id,
        tenantAdminPassword: password,
      },
    });

    await tx.user.create({
      data: {
        tenantId: created.id,
        employeeCode,
        name: adminName,
        email,
        passwordHash,
        role: "tenant_admin",
        status: "active",
        consentAt: new Date(),
        stationAccess: "*",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: created.id,
        action: "platform.tenant.create",
        entityType: "tenant",
        entityId: created.id,
        meta: JSON.stringify({
          slug,
          planId,
          adminEmail: email,
          platformAdminId: session.id,
          platformAdminEmail: session.email,
        }),
      },
    });

    return created;
  });

  await syncUsageMeter(tenant.id);

  return NextResponse.json({ ok: true, tenant: { id: tenant.id, slug: tenant.slug } });
}


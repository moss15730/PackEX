import { NextResponse } from "next/server";
import { hashPassword, requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_STATUS = ["trial", "active", "suspended"] as const;

async function resolveTenant(key: string) {
  const byId = await prisma.tenant.findUnique({
    where: { id: key },
    include: { subscription: true },
  });
  if (byId) return byId;

  return prisma.tenant.findUnique({
    where: { slug: key },
    include: { subscription: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการ Tenants" }, { status: 403 });
  }

  const { tenant: key } = await params;
  const tenant = await resolveTenant(key);

  if (!tenant || tenant.status === "deleted") {
    return NextResponse.json({ error: "ไม่พบองค์กร" }, { status: 404 });
  }

  const id = tenant.id;

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    status?: string;
    planId?: string;
    quota?: {
      maxStations?: number | null;
      maxStorageGb?: number | null;
      maxUsers?: number | null;
    };
    tenantAdmin?: {
      email?: string;
      password?: string;
    };
  };

  const data: { name?: string; status?: string } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "ชื่อองค์กรไม่ถูกต้อง" }, { status: 400 });
    }
    data.name = name;
  }

  if (body.status !== undefined) {
    if (!(ALLOWED_STATUS as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }
    data.status = body.status;
  }

  const planId = body.planId?.trim();
    if (planId) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (!plan) {
        return NextResponse.json({ error: "ไม่พบแผนราคา" }, { status: 404 });
      }
    }

  const quota = body.quota;
  const quotaData =
    quota !== undefined
      ? {
          maxStationsOverride:
            quota.maxStations === null || quota.maxStations === undefined
              ? null
              : Math.max(0, Math.trunc(Number(quota.maxStations))),
          maxStorageGbOverride:
            quota.maxStorageGb === null || quota.maxStorageGb === undefined
              ? null
              : Math.max(0, Math.trunc(Number(quota.maxStorageGb))),
          maxUsersOverride:
            quota.maxUsers === null || quota.maxUsers === undefined
              ? null
              : Math.max(0, Math.trunc(Number(quota.maxUsers))),
        }
      : null;

  const tenantAdmin = body.tenantAdmin;
  let tenantAdminUserId: string | null = null;
  let tenantAdminEmail: string | undefined;
  let tenantAdminPasswordHash: string | undefined;

  if (tenantAdmin && (tenantAdmin.email !== undefined || tenantAdmin.password)) {
    const adminUser = await prisma.user.findFirst({
      where: { tenantId: id, role: "tenant_admin", status: "active" },
      orderBy: { createdAt: "asc" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "ไม่พบ Tenant Admin" }, { status: 404 });
    }

    tenantAdminUserId = adminUser.id;

    if (tenantAdmin.email !== undefined) {
      const email = tenantAdmin.email.trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "อีเมลว่างไม่ได้" }, { status: 400 });
      }
      if (email !== adminUser.email) {
        const clash = await prisma.user.findUnique({ where: { email } });
        if (clash) {
          return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
        }
      }
      tenantAdminEmail = email;
    }

    if (tenantAdmin.password) {
      if (tenantAdmin.password.length < 8) {
        return NextResponse.json(
          { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
          { status: 400 },
        );
      }
      tenantAdminPasswordHash = await hashPassword(tenantAdmin.password);
    }
  }

  const hasTenantUpdate = Object.keys(data).length > 0;
  const hasPlanUpdate = Boolean(planId);
  const hasQuotaUpdate = Boolean(quotaData);
  const hasAdminUpdate = Boolean(tenantAdminEmail || tenantAdminPasswordHash);

  if (!hasTenantUpdate && !hasPlanUpdate && !hasQuotaUpdate && !hasAdminUpdate) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่จะอัปเดต" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.tenant.update({
      where: { id },
      data,
      include: { subscription: { include: { plan: true } } },
    });

    if (planId && tenant.subscription) {
      await tx.subscription.update({
        where: { tenantId: id },
        data: { planId },
      });
    } else if (planId && !tenant.subscription) {
      await tx.subscription.create({
        data: {
          tenantId: id,
          planId,
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (quotaData) {
      await tx.tenantSettings.upsert({
        where: { tenantId: id },
        update: quotaData,
        create: { tenantId: id, ...quotaData },
      });
    }

    if (tenantAdminUserId && (tenantAdminEmail || tenantAdminPasswordHash)) {
      await tx.user.update({
        where: { id: tenantAdminUserId },
        data: {
          ...(tenantAdminEmail ? { email: tenantAdminEmail } : {}),
          ...(tenantAdminPasswordHash ? { passwordHash: tenantAdminPasswordHash } : {}),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: id,
        action: "platform.tenant.update",
        entityType: "tenant",
        entityId: id,
        meta: JSON.stringify({
          name: data.name,
          status: data.status,
          planId: planId || undefined,
          quota: quotaData ?? undefined,
          tenantAdminEmail: tenantAdminEmail || undefined,
          tenantAdminPasswordChanged: Boolean(tenantAdminPasswordHash),
        }),
      },
    });

    return result;
  });

  const withPlan = await prisma.tenant.findUnique({
    where: { id },
    include: { subscription: { include: { plan: true } } },
  });

  return NextResponse.json({ ok: true, tenant: withPlan ?? updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการ Tenants" }, { status: 403 });
  }

  const { tenant: key } = await params;
  const tenant = await resolveTenant(key);

  if (!tenant || tenant.status === "deleted") {
    return NextResponse.json({ error: "ไม่พบองค์กร" }, { status: 404 });
  }

  const id = tenant.id;
  const slug = tenant.slug;

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        action: "platform.tenant.delete",
        entityType: "tenant",
        entityId: id,
        meta: JSON.stringify({
          slug,
          hardDelete: true,
          platformAdminId: session.id,
          platformAdminEmail: session.email,
        }),
      },
    });

    await tx.tenant.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}

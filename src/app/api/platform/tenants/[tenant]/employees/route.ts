import { NextResponse } from "next/server";
import { hashPassword, requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getUsageAndLimits,
  isUserLimitReached,
  syncUsageMeter,
} from "@/lib/tenant-limits";

function normalizeEmployeeCode(code: string) {
  return code.trim().toUpperCase();
}

async function validateStationAccess(
  tenantId: string,
  allStations: boolean,
  stationIds: string[],
) {
  if (allStations) return { ok: true as const, value: "*" };
  const ids = [...new Set(stationIds.filter(Boolean))];
  if (!ids.length) {
    return {
      ok: false as const,
      error: "กรุณาเลือกสถานีอย่างน้อย 1 แห่ง หรือเลือกทุกสถานี",
    };
  }

  const count = await prisma.station.count({
    where: { tenantId, id: { in: ids } },
  });
  if (count !== ids.length) {
    return { ok: false as const, error: "มีสถานีที่เลือกไม่ถูกต้อง" };
  }

  return { ok: true as const, value: ids.join(",") };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการ Tenants" }, { status: 403 });
  }

  const { tenant } = await params; // tenant slug
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    employeeCode?: string;
    email?: string;
    password?: string;
    allStations?: boolean;
    stationIds?: string[];
  };

  const tenantObj = await prisma.tenant.findUnique({
    where: { slug: tenant },
    include: { subscription: { include: { plan: true } } },
  });

  if (!tenantObj) return NextResponse.json({ error: "ไม่พบ tenant" }, { status: 404 });
  if (!tenantObj.subscription?.plan) {
    return NextResponse.json({ error: "tenant ไม่มี subscription/plan" }, { status: 400 });
  }

  const role = "tenant_admin";

  const name = body.name?.trim() || "";
  const employeeCode = body.employeeCode ? normalizeEmployeeCode(body.employeeCode) : "";
  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password ? String(body.password) : "";
  const allStations = Boolean(body.allStations);
  const stationIds = body.stationIds ?? [];

  if (!name || !employeeCode || !email || !password) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
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

  const [codeClash, emailClash, stationAccess] = await Promise.all([
    prisma.user.findUnique({
      where: {
        tenantId_employeeCode: { tenantId: tenantObj.id, employeeCode },
      },
    }),
    prisma.user.findUnique({ where: { email } }),
    validateStationAccess(tenantObj.id, allStations, stationIds),
  ]);

  if (codeClash) {
    return NextResponse.json({ error: "รหัสพนักงานนี้มีอยู่แล้ว" }, { status: 409 });
  }
  if (emailClash) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
  }
  if (!stationAccess.ok) {
    return NextResponse.json({ error: stationAccess.error }, { status: 400 });
  }

  const { limits, usage } = await getUsageAndLimits(tenantObj.id);
  if (!limits) {
    return NextResponse.json({ error: "tenant ไม่มี subscription/plan" }, { status: 400 });
  }
  if (isUserLimitReached(usage, limits)) {
    return NextResponse.json(
      {
        error: `ถึงจำนวนผู้ใช้สูงสุดแล้ว (${usage.usersUsed}/${limits.maxUsers})`,
      },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);

  const employee = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        tenantId: tenantObj.id,
        employeeCode,
        name,
        email,
        passwordHash,
        role,
        status: "active",
        stationAccess: stationAccess.value,
        consentAt: new Date(),
      },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,
        status: true,
        stationAccess: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenantObj.id,
        action: "platform.employee.create",
        entityType: "user",
        entityId: created.id,
        meta: JSON.stringify({
          employeeCode,
          email,
          role,
          platformAdminId: session.id,
          platformAdminEmail: session.email,
        }),
      },
    });

    return created;
  });

  await syncUsageMeter(tenantObj.id);

  return NextResponse.json({ ok: true, employee }, { status: 201 });
}


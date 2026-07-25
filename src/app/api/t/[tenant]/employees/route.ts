import { NextResponse } from "next/server";
import { can, hashPassword, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refreshOnboardingState } from "@/lib/onboarding";
import { denyIfReadOnly } from "@/lib/tenant-access";
import {
  getUsageAndLimits,
  isUserLimitReached,
  syncUsageMeter,
} from "@/lib/tenant-limits";

const ASSIGNABLE_ROLES = [
  "tenant_admin",
  "supervisor",
  "packer",
  "viewer",
  "claim_officer",
] as const;

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
    return { ok: false as const, error: "กรุณาเลือกสถานีอย่างน้อย 1 แห่ง หรือเลือกทุกสถานี" };
  }
  const count = await prisma.station.count({
    where: { tenantId, id: { in: ids } },
  });
  if (count !== ids.length) {
    return { ok: false as const, error: "มีสถานีที่เลือกไม่ถูกต้อง" };
  }
  return { ok: true as const, value: ids.join(",") };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (!can(session.role, "employees.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการพนักงาน" }, { status: 403 });
  }

  const employees = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ employeeCode: "asc" }, { name: "asc" }],
    select: {
      id: true,
      employeeCode: true,
      name: true,
      email: true,
      role: true,
      status: true,
      stationAccess: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ employees });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const denied = await denyIfReadOnly(session.tenantId);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  if (!can(session.role, "employees.manage")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการพนักงาน" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    employeeCode?: string;
    email?: string;
    password?: string;
    role?: string;
    status?: string;
    allStations?: boolean;
    stationIds?: string[];
  };

  const name = body.name?.trim();
  const employeeCode = body.employeeCode ? normalizeEmployeeCode(body.employeeCode) : "";
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const role = body.role?.trim();
  const status = body.status === "disabled" ? "disabled" : "active";

  if (!name || !employeeCode || !email || !password || !role) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  }

  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "บทบาทไม่ถูกต้อง" }, { status: 400 });
  }

  if (!/^[A-Z0-9][A-Z0-9\-_]*$/.test(employeeCode)) {
    return NextResponse.json(
      { error: "รหัสพนักงานใช้ได้เฉพาะตัวอักษร ตัวเลข - และ _" },
      { status: 400 },
    );
  }

  const stationResult = await validateStationAccess(
    session.tenantId,
    Boolean(body.allStations),
    body.stationIds ?? [],
  );
  if (!stationResult.ok) {
    return NextResponse.json({ error: stationResult.error }, { status: 400 });
  }

  const [codeClash, emailClash] = await Promise.all([
    prisma.user.findUnique({
      where: {
        tenantId_employeeCode: { tenantId: session.tenantId, employeeCode },
      },
    }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  if (codeClash) {
    return NextResponse.json({ error: "รหัสพนักงานนี้มีอยู่แล้ว" }, { status: 409 });
  }
  if (emailClash) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
  }

  const { limits, usage } = await getUsageAndLimits(session.tenantId);
  if (!limits) {
    return NextResponse.json({ error: "ไม่พบแพ็กเกจขององค์กร" }, { status: 400 });
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

  const employee = await prisma.user.create({
    data: {
      tenantId: session.tenantId,
      employeeCode,
      name,
      email,
      passwordHash,
      role,
      status,
      stationAccess: stationResult.value,
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

  await syncUsageMeter(session.tenantId);
  await refreshOnboardingState(session.tenantId);

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "employee.create",
      entityType: "user",
      entityId: employee.id,
      meta: JSON.stringify({ employeeCode, email, role }),
    },
  });

  return NextResponse.json({ ok: true, employee }, { status: 201 });
}

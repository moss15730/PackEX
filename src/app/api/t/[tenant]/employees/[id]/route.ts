import { NextResponse } from "next/server";
import { can, hashPassword, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncUsageMeter } from "@/lib/tenant-limits";
import { denyIfReadOnly } from "@/lib/tenant-access";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
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

  const employee = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
  });

  if (!employee) {
    return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
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

  const data: {
    name?: string;
    employeeCode?: string;
    email?: string;
    passwordHash?: string;
    role?: string;
    status?: string;
    stationAccess?: string | null;
  } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "ชื่อว่างไม่ได้" }, { status: 400 });
    data.name = name;
  }

  if (body.employeeCode !== undefined) {
    const employeeCode = normalizeEmployeeCode(body.employeeCode);
    if (!employeeCode) {
      return NextResponse.json({ error: "รหัสพนักงานว่างไม่ได้" }, { status: 400 });
    }
    if (!/^[A-Z0-9][A-Z0-9\-_]*$/.test(employeeCode)) {
      return NextResponse.json(
        { error: "รหัสพนักงานใช้ได้เฉพาะตัวอักษร ตัวเลข - และ _" },
        { status: 400 },
      );
    }
    if (employeeCode !== employee.employeeCode) {
      const clash = await prisma.user.findUnique({
        where: {
          tenantId_employeeCode: { tenantId: session.tenantId, employeeCode },
        },
      });
      if (clash) {
        return NextResponse.json({ error: "รหัสพนักงานนี้มีอยู่แล้ว" }, { status: 409 });
      }
    }
    data.employeeCode = employeeCode;
  }

  if (body.email !== undefined) {
    const email = body.email.trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "อีเมลว่างไม่ได้" }, { status: 400 });
    if (email !== employee.email) {
      const clash = await prisma.user.findUnique({ where: { email } });
      if (clash) {
        return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
      }
    }
    data.email = email;
  }

  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.password);
  }

  if (body.role !== undefined) {
    if (!(ASSIGNABLE_ROLES as readonly string[]).includes(body.role)) {
      return NextResponse.json({ error: "บทบาทไม่ถูกต้อง" }, { status: 400 });
    }
    if (employee.role === "tenant_admin" && body.role !== "tenant_admin") {
      const adminCount = await prisma.user.count({
        where: { tenantId: session.tenantId, role: "tenant_admin", status: "active" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "ต้องมี Tenant Admin อย่างน้อย 1 คน" },
          { status: 400 },
        );
      }
    }
    data.role = body.role;
  }

  if (body.status !== undefined) {
    const status = body.status === "disabled" ? "disabled" : "active";
    if (employee.id === session.id && status === "disabled") {
      return NextResponse.json({ error: "ไม่สามารถปิดใช้งานบัญชีของตัวเองได้" }, { status: 400 });
    }
    if (employee.role === "tenant_admin" && status === "disabled") {
      const adminCount = await prisma.user.count({
        where: { tenantId: session.tenantId, role: "tenant_admin", status: "active" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "ต้องมี Tenant Admin ที่ใช้งานอยู่อย่างน้อย 1 คน" },
          { status: 400 },
        );
      }
    }
    data.status = status;
  }

  if (body.allStations !== undefined || body.stationIds !== undefined) {
    const stationResult = await validateStationAccess(
      session.tenantId,
      Boolean(body.allStations),
      body.stationIds ?? [],
    );
    if (!stationResult.ok) {
      return NextResponse.json({ error: stationResult.error }, { status: 400 });
    }
    data.stationAccess = stationResult.value;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่จะอัปเดต" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: employee.id },
    data,
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

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "employee.update",
      entityType: "user",
      entityId: employee.id,
      meta: JSON.stringify({
        employeeCode: updated.employeeCode,
        fields: Object.keys(data).filter((k) => k !== "passwordHash"),
      }),
    },
  });

  return NextResponse.json({ ok: true, employee: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
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

  const employee = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { _count: { select: { recordings: true } } },
  });

  if (!employee) {
    return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
  }

  if (employee.id === session.id) {
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีของตัวเองได้" }, { status: 400 });
  }

  if (employee.role === "tenant_admin") {
    const adminCount = await prisma.user.count({
      where: { tenantId: session.tenantId, role: "tenant_admin" },
    });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "ต้องมี Tenant Admin อย่างน้อย 1 คน" },
        { status: 400 },
      );
    }
  }

  if (employee._count.recordings > 0) {
    return NextResponse.json(
      {
        error: `ลบไม่ได้ เพราะมีวิดีโออัด ${employee._count.recordings} รายการ — ปิดใช้งานแทนได้`,
      },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id: employee.id } });

  await syncUsageMeter(session.tenantId);

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "employee.delete",
      entityType: "user",
      entityId: employee.id,
      meta: JSON.stringify({
        employeeCode: employee.employeeCode,
        email: employee.email,
      }),
    },
  });

  return NextResponse.json({ ok: true });
}

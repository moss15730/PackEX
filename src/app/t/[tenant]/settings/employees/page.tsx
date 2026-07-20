import { redirect } from "next/navigation";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { EmployeesManager } from "@/components/employees-manager";

export default async function SettingsEmployeesPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId || !session.tenantSlug) return null;

  if (!can(session.role, "employees.manage")) {
    redirect(`/t/${session.tenantSlug}/dashboard`);
  }

  const [employees, stations] = await Promise.all([
    prisma.user.findMany({
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
      },
    }),
    prisma.station.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="พนักงาน"
        description="จัดการบัญชีพนักงาน บทบาท สถานี และรหัสเข้าใช้ระบบ"
      />
      <EmployeesManager
        tenantSlug={session.tenantSlug}
        currentUserId={session.id}
        employees={employees}
        stations={stations}
      />
    </div>
  );
}

import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { roleLabel } from "@/lib/utils";

export default async function SettingsEmployeesPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="พนักงาน" description="ผู้ใช้งานและบทบาทในองค์กร" />

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">ชื่อ</th>
              <th className="px-4 py-3 font-medium">อีเมล</th>
              <th className="px-4 py-3 font-medium">บทบาท</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">สถานี</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{roleLabel(user.role)}</td>
                <td className="px-4 py-3">
                  <Badge tone={user.status === "active" ? "success" : "danger"}>
                    {user.status === "active" ? "ใช้งาน" : "ปิดใช้"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {user.stationAccess === "*" ? "ทุกสถานี" : user.stationAccess ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function PlatformDataRequestsPage() {
  const requests = await prisma.dataRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  const tenantIds = [...new Set(requests.map((r) => r.tenantId))];
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, slug: true },
  });
  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t.slug]));

  return (
    <div>
      <PageHeader
        title="Data Requests"
        description="คำขอส่งออก/ลบข้อมูลตาม PDPA"
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">ประเภท</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">วันที่</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-mono">{tenantMap[r.tenantId] ?? r.tenantId}</td>
                <td className="px-4 py-3">{r.type === "export" ? "ส่งออก" : "ลบข้อมูล"}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.status === "pending" ? "warning" : "success"}>
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {format(r.createdAt, "d MMM yyyy", { locale: th })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && (
          <p className="px-4 py-8 text-center text-[var(--muted)]">ไม่มีคำขอ</p>
        )}
      </Card>
    </div>
  );
}

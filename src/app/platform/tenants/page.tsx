import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { statusLabel } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function PlatformTenantsPage() {
  const tenants = await prisma.tenant.findMany({
    where: { status: { not: "deleted" } },
    include: {
      subscription: { include: { plan: true } },
      usageMeters: true,
      _count: { select: { users: true, stations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Tenants" description="องค์กรทั้งหมดบนแพลตฟอร์ม" />

      <Card className="overflow-x-auto p-0">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">ชื่อ</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">แผน</th>
              <th className="px-4 py-3 font-medium">สถานี/ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-mono">{t.slug}</td>
                <td className="px-4 py-3">{t.name}</td>
                <td className="px-4 py-3">
                  <Badge tone={t.status === "active" ? "success" : t.status === "suspended" ? "danger" : "neutral"}>
                    {statusLabel(t.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3">{t.subscription?.plan.nameTh ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {t._count.stations} / {t._count.users}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {format(t.createdAt, "d MMM yyyy", { locale: th })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

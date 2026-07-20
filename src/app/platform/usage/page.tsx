import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";

export default async function PlatformUsagePage() {
  const meters = await prisma.usageMeter.findMany({
    include: { tenant: true },
    orderBy: { storageUsedGb: "desc" },
  });

  return (
    <div>
      <PageHeader title="Usage" description="การใช้งานทรัพยากรตาม tenant" />

      <Card className="overflow-x-auto p-0">
        <table className="min-w-[560px] w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">สถานี</th>
              <th className="px-4 py-3 font-medium">พื้นที่ (GB)</th>
              <th className="px-4 py-3 font-medium">ผู้ใช้</th>
            </tr>
          </thead>
          <tbody>
            {meters.map((m) => (
              <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-mono">{m.tenant.slug}</td>
                <td className="px-4 py-3">{m.stationsUsed}</td>
                <td className="px-4 py-3">{m.storageUsedGb.toFixed(1)}</td>
                <td className="px-4 py-3">{m.usersUsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { PageHeader, Stat, Card } from "@/components/ui";

export default async function PlatformOverviewPage() {
  const [tenantCount, activeTenants, agents, announcements] = await Promise.all([
    prisma.tenant.count({ where: { status: { not: "deleted" } } }),
    prisma.tenant.count({ where: { status: "active" } }),
    prisma.stationAgent.findMany({ include: { station: { include: { tenant: true } } } }),
    prisma.announcement.findMany({ where: { active: true }, take: 3 }),
  ]);

  const onlineAgents = agents.filter((a) => a.online).length;
  const offlineAgents = agents.length - onlineAgents;

  return (
    <div>
      <PageHeader
        title="Platform Overview"
        description="ภาพรวม tenant และสุขภาพระบบ PackEX"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tenants" value={tenantCount} />
        <Stat label="Active" value={activeTenants} tone="success" />
        <Stat label="Agents ออนไลน์" value={onlineAgents} />
        <Stat label="Agents ออฟไลน์" value={offlineAgents} tone={offlineAgents > 0 ? "danger" : "default"} />
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold text-[var(--ink)]">ประกาศที่ใช้งาน</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">ไม่มีประกาศ</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {announcements.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong> — {a.body}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

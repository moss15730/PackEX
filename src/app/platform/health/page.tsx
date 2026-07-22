import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function PlatformHealthPage() {
  const agents = await prisma.stationAgent.findMany({
    include: {
      station: { include: { tenant: true, cameras: true } },
    },
    orderBy: { lastHeartbeatAt: "desc" },
  });

  // Snapshot once per request for stale detection (server component).
  const nowMs = Date.now(); // eslint-disable-line react-hooks/purity -- request-time clock

  return (
    <div>
      <PageHeader title="สุขภาพระบบ" description="Station Agent heartbeat ทั้งแพลตฟอร์ม" />

      <div className="space-y-3">
        {agents.map((agent) => {
          const stale =
            !agent.lastHeartbeatAt ||
            nowMs - agent.lastHeartbeatAt.getTime() > 5 * 60 * 1000;
          return (
            <Card key={agent.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-sm">{agent.station.tenant.slug}</span>
                  <span className="mx-2 text-[var(--muted)]">/</span>
                  <span className="font-semibold">{agent.station.code}</span>
                </div>
                <Badge tone={agent.online && !stale ? "success" : "danger"}>
                  {agent.online && !stale ? "ออนไลน์" : "ต้องตรวจ"}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
                <div>
                  <dt className="text-[var(--muted)]">เวอร์ชัน</dt>
                  <dd>{agent.version}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">CPU</dt>
                  <dd>{agent.cpuPercent?.toFixed(0) ?? "—"}%</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">ดิสก์ว่าง</dt>
                  <dd>{agent.diskFreeGb?.toFixed(1) ?? "—"} GB</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Heartbeat</dt>
                  <dd>
                    {agent.lastHeartbeatAt
                      ? format(agent.lastHeartbeatAt, "HH:mm:ss", { locale: th })
                      : "—"}
                  </dd>
                </div>
              </dl>
            </Card>
          );
        })}
        {agents.length === 0 && (
          <p className="text-center text-[var(--muted)]">ไม่มี agent</p>
        )}
      </div>
    </div>
  );
}

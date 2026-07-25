import { Cpu, HardDrive, HeartPulse, Radio, ServerOff } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState, PageHeader, Progress, Stat } from "@/components/ui";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function PlatformHealthPage() {
  const agents = await prisma.stationAgent.findMany({
    include: { station: { include: { tenant: true, cameras: true } } },
    orderBy: { lastHeartbeatAt: "desc" },
  });

  // Snapshot once per request for stale detection (server component).
  const nowMs = Date.now(); // eslint-disable-line react-hooks/purity -- request-time clock

  const healthy = agents.filter(
    (a) => a.online && a.lastHeartbeatAt && nowMs - a.lastHeartbeatAt.getTime() <= 5 * 60 * 1000,
  ).length;

  return (
    <div>
      <PageHeader
        title="สุขภาพระบบ"
        description="Station Agent heartbeat ของทุก tenant ในแพลตฟอร์ม"
      />

      {agents.length > 0 ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Agents ทั้งหมด" value={agents.length} icon={Radio} />
          <Stat label="ปกติ" value={healthy} icon={HeartPulse} tone="success" />
          <Stat
            label="ต้องตรวจสอบ"
            value={agents.length - healthy}
            icon={ServerOff}
            tone={agents.length - healthy > 0 ? "danger" : "default"}
          />
        </div>
      ) : null}

      {agents.length === 0 ? (
        <EmptyState
          icon={ServerOff}
          title="ยังไม่มี station agent"
          description="เมื่อ agent เริ่มส่ง heartbeat ข้อมูลสุขภาพจะแสดงที่นี่"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => {
            const stale =
              !agent.lastHeartbeatAt ||
              nowMs - agent.lastHeartbeatAt.getTime() > 5 * 60 * 1000;
            const ok = agent.online && !stale;
            const cpu = agent.cpuPercent ?? null;

            return (
              <Card key={agent.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">
                        {agent.station.tenant.slug}
                      </span>
                      <span className="text-faint">/</span>
                      <span className="text-[15px] font-semibold text-ink">
                        {agent.station.code}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">
                      {agent.station.name} · {agent.station.cameras.length} กล้อง
                    </p>
                  </div>
                  <Badge tone={ok ? "success" : "danger"} dot>
                    {ok ? "ออนไลน์" : "ต้องตรวจสอบ"}
                  </Badge>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted">เวอร์ชัน</dt>
                    <dd className="mt-1 font-mono text-[13px] text-ink">{agent.version}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted">
                      <HardDrive size={12} />
                      ดิสก์ว่าง
                    </dt>
                    <dd className="tabular mt-1 text-[13px] text-ink">
                      {agent.diskFreeGb?.toFixed(1) ?? "—"} GB
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted">
                      <HeartPulse size={12} />
                      Heartbeat
                    </dt>
                    <dd className="tabular mt-1 text-[13px] text-ink">
                      {agent.lastHeartbeatAt
                        ? format(agent.lastHeartbeatAt, "HH:mm:ss", { locale: th })
                        : "—"}
                    </dd>
                  </div>
                </dl>

                {cpu != null ? (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted">
                        <Cpu size={12} />
                        CPU
                      </span>
                      <span className="tabular font-medium text-ink-2">{cpu.toFixed(0)}%</span>
                    </div>
                    <Progress
                      className="mt-2"
                      value={cpu}
                      tone={cpu >= 90 ? "danger" : cpu >= 70 ? "warning" : "brand"}
                    />
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

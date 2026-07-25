import {
  CheckCircle2,
  Cpu,
  HardDrive,
  HeartPulse,
  Radio,
  ServerOff,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import {
  Badge,
  Callout,
  Card,
  EmptyState,
  PageHeader,
  Progress,
  Stat,
} from "@/components/ui";
import { collectSystemChecks, type CheckStatus } from "@/lib/system-health";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export const dynamic = "force-dynamic";

const CHECK_STYLES: Record<
  CheckStatus,
  { icon: typeof CheckCircle2; wrap: string; label: string; tone: "success" | "warning" | "danger" }
> = {
  ok: {
    icon: CheckCircle2,
    wrap: "bg-success-soft text-success-ink",
    label: "ปกติ",
    tone: "success",
  },
  warn: {
    icon: TriangleAlert,
    wrap: "bg-warning-soft text-warning-ink",
    label: "ต้องดู",
    tone: "warning",
  },
  fail: {
    icon: XCircle,
    wrap: "bg-danger-soft text-danger-ink",
    label: "ล้มเหลว",
    tone: "danger",
  },
};

export default async function PlatformHealthPage() {
  const [agents, system] = await Promise.all([
    prisma.stationAgent.findMany({
      include: { station: { include: { tenant: true, cameras: true } } },
      orderBy: { lastHeartbeatAt: "desc" },
    }),
    collectSystemChecks(),
  ]);

  // Snapshot once per request for stale detection (server component).
  const nowMs = Date.now(); // eslint-disable-line react-hooks/purity -- request-time clock

  const healthy = agents.filter(
    (a) => a.online && a.lastHeartbeatAt && nowMs - a.lastHeartbeatAt.getTime() <= 5 * 60 * 1000,
  ).length;

  return (
    <div>
      <PageHeader
        title="สุขภาพระบบ"
        description="สถานะโครงสร้างพื้นฐานและ Station Agent ของทุก tenant"
        actions={
          <Badge tone={CHECK_STYLES[system.status].tone} dot>
            ระบบ{CHECK_STYLES[system.status].label}
          </Badge>
        }
      />

      {/* Infrastructure */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold tracking-tight text-ink">
          โครงสร้างพื้นฐาน
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {system.checks.map((check) => {
            const style = CHECK_STYLES[check.status];
            const Icon = style.icon;
            return (
              <div
                key={check.key}
                className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    style.wrap,
                  )}
                >
                  <Icon size={17} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{check.label}</p>
                    {check.latencyMs != null ? (
                      <span className="tabular shrink-0 text-xs text-faint">
                        {check.latencyMs} ms
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{check.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {system.envIssues.length > 0 ? (
          <Callout
            tone={system.envIssues.some((i) => i.level === "error") ? "danger" : "warning"}
            icon={TriangleAlert}
            title="ค่าตั้งค่าที่ต้องแก้ก่อน go-live"
            className="mt-3"
          >
            <ul className="mt-1 space-y-1">
              {system.envIssues.map((issue) => (
                <li key={issue.key}>
                  <span className="font-mono text-xs">{issue.key}</span> — {issue.message}
                </li>
              ))}
            </ul>
          </Callout>
        ) : null}
      </section>

      <h2 className="mb-3 text-base font-semibold tracking-tight text-ink">Station agents</h2>

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

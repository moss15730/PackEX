import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncTenantAlerts } from "@/lib/alerts";
import { PageHeader, Stat, Card, Badge } from "@/components/ui";
import { startOfDay, subDays, format } from "date-fns";
import { th } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const tenantId = session.tenantId;
  const today = startOfDay(new Date());
  const weekStart = subDays(today, 6);

  await syncTenantAlerts(tenantId);

  const [videosToday, stations, usage, agents, alerts, weekRecordings] = await Promise.all([
    prisma.recording.count({
      where: { tenantId, startedAt: { gte: today } },
    }),
    prisma.station.findMany({
      where: { tenantId },
      include: { agent: true },
    }),
    prisma.usageMeter.findUnique({ where: { tenantId } }),
    prisma.stationAgent.findMany({ where: { tenantId } }),
    prisma.alert.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.recording.findMany({
      where: {
        tenantId,
        startedAt: { gte: weekStart },
        status: { notIn: ["deleted", "canceled"] },
      },
      select: { startedAt: true },
    }),
  ]);

  const OFFLINE = new Set(["offline", "blocked", "disk_full", "camera_error", "disabled"]);
  const stationsOnline = stations.filter((s) => {
    if (OFFLINE.has(s.status)) return false;
    if (s.agent) return s.agent.online;
    return true;
  }).length;
  const uploadQueue = agents.reduce((sum, a) => sum + a.queueSize, 0);
  const storageGb = usage?.storageUsedGb ?? 0;

  const dayLabels = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const dayStart = startOfDay(subDays(today, 6 - i));
    const dayEnd = i < 6 ? startOfDay(subDays(today, 5 - i)) : startOfDay(subDays(today, -1));
    const count = weekRecordings.filter(
      (r) => r.startedAt >= dayStart && r.startedAt < dayEnd,
    ).length;
    return {
      label: dayLabels[dayStart.getDay()],
      count,
      date: format(dayStart, "d MMM", { locale: th }),
    };
  });
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <div>
      <PageHeader
        title="แดชบอร์ด"
        description="ภาพรวมการแพ็คและสถานะสถานีวันนี้"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="วิดีโอวันนี้" value={videosToday} hint="อัดวันนี้" />
        <Stat
          label="สถานีออนไลน์"
          value={`${stationsOnline}/${stations.length}`}
          tone={stationsOnline < stations.length ? "danger" : "success"}
        />
        <Stat label="พื้นที่ใช้งาน" value={`${storageGb.toFixed(1)} GB`} />
        <Stat label="คิวอัปโหลด" value={uploadQueue} hint="ไฟล์รอ sync" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            แจ้งเตือนล่าสุด
          </h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">ไม่มีแจ้งเตือน</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-sm">
                  <Badge
                    tone={
                      a.severity === "critical"
                        ? "danger"
                        : a.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    {a.severity}
                  </Badge>
                  <div>
                    <div className="font-medium text-[var(--ink)]">{a.title}</div>
                    <div className="text-[var(--muted)]">{a.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            กราฟการแพ็ค (7 วัน)
          </h2>
          <div className="flex h-40 items-end justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-4 pb-4 pt-8">
            {chartData.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-[var(--ink)]">{d.count}</span>
                <div
                  className="w-full rounded-t bg-[var(--accent)]/70 transition-all"
                  style={{ height: `${Math.max((d.count / maxCount) * 120, d.count > 0 ? 8 : 4)}px` }}
                  title={`${d.date}: ${d.count} วิดีโอ`}
                />
                <span className="text-[10px] text-[var(--muted)]">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            รวม {chartData.reduce((s, d) => s + d.count, 0)} วิดีโอใน 7 วันล่าสุด
          </p>
        </Card>
      </div>
    </div>
  );
}

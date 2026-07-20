import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Stat, Card, Badge } from "@/components/ui";
import { startOfDay } from "date-fns";

export default async function DashboardPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const tenantId = session.tenantId;
  const today = startOfDay(new Date());

  const [videosToday, stations, usage, agents, alerts] = await Promise.all([
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
  ]);

  const OFFLINE = new Set(["offline", "blocked", "disk_full", "camera_error"]);
  const stationsOnline = stations.filter((s) => {
    if (OFFLINE.has(s.status)) return false;
    // มี Agent → ใช้ออนไลน์จาก heartbeat; ไม่มี Agent (สถานีเว็บ) → นับจากสถานะสถานี
    if (s.agent) return s.agent.online;
    return true;
  }).length;
  const uploadQueue = agents.reduce((sum, a) => sum + a.queueSize, 0);
  const storageGb = usage?.storageUsedGb ?? 0;

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
            {[12, 18, 9, 22, 15, 28, videosToday || 8].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[var(--accent)]/70"
                  style={{ height: `${Math.max(h * 3, 8)}px` }}
                />
                <span className="text-[10px] text-[var(--muted)]">
                  {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"][i]}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">ข้อมูลตัวอย่าง — เชื่อม BI ในเวอร์ชันถัดไป</p>
        </Card>
      </div>
    </div>
  );
}

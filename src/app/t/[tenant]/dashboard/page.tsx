import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BellRing,
  Camera,
  CheckCircle2,
  Film,
  HardDrive,
  UploadCloud,
} from "lucide-react";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncTenantAlerts } from "@/lib/alerts";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/utils";
import { startOfDay, subDays, format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const tenantId = session.tenantId;
  const tenantSlug = session.tenantSlug;
  const today = startOfDay(new Date());
  const weekStart = subDays(today, 6);

  await syncTenantAlerts(tenantId);

  const [videosToday, stations, usage, agents, alerts, weekRecordings, recent] =
    await Promise.all([
      prisma.recording.count({ where: { tenantId, startedAt: { gte: today } } }),
      prisma.station.findMany({ where: { tenantId }, include: { agent: true } }),
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
      prisma.recording.findMany({
        where: { tenantId, status: { not: "deleted" }, deletedAt: null },
        include: { order: true, station: true, employee: true },
        orderBy: { startedAt: "desc" },
        take: 6,
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
      isToday: i === 6,
    };
  });
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);
  const weekTotal = chartData.reduce((s, d) => s + d.count, 0);
  const avgPerDay = Math.round((weekTotal / 7) * 10) / 10;

  const allOnline = stationsOnline === stations.length;

  return (
    <div>
      <PageHeader
        title="แดชบอร์ด"
        description="ภาพรวมการแพ็คและสถานะสถานีขององค์กรวันนี้"
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="วิดีโอวันนี้"
          value={videosToday}
          icon={Film}
          hint={`เฉลี่ย ${avgPerDay} คลิป/วัน ใน 7 วัน`}
        />
        <Stat
          label="สถานีออนไลน์"
          value={`${stationsOnline}/${stations.length}`}
          icon={Camera}
          tone={allOnline ? "success" : "danger"}
          hint={allOnline ? "ทุกสถานีพร้อมใช้งาน" : "มีสถานีที่ต้องตรวจสอบ"}
        />
        <Stat
          label="พื้นที่ใช้งาน"
          value={`${storageGb.toFixed(1)} GB`}
          icon={HardDrive}
          hint="รวมทุกวิดีโอที่เก็บอยู่"
        />
        <Stat
          label="คิวอัปโหลด"
          value={uploadQueue}
          icon={UploadCloud}
          tone={uploadQueue > 0 ? "warning" : "default"}
          hint={uploadQueue > 0 ? "ไฟล์รอ sync ขึ้นคลาวด์" : "ไม่มีไฟล์ค้างคิว"}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-5">
        {/* Chart */}
        <Card className="lg:col-span-3" flush>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">ปริมาณการแพ็ค</h2>
              <p className="mt-0.5 text-[13px] text-muted">
                รวม {weekTotal} วิดีโอใน 7 วันล่าสุด
              </p>
            </div>
            <Badge icon={Activity}>7 วัน</Badge>
          </div>

          <div className="px-5 py-6">
            <div className="flex h-48 items-end justify-between gap-2 sm:gap-3">
              {chartData.map((d) => {
                const height = Math.max((d.count / maxCount) * 100, d.count > 0 ? 6 : 2);
                return (
                  <div
                    key={d.date}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span className="text-[11px] font-medium text-ink tabular opacity-0 transition group-hover:opacity-100 data-[show=true]:opacity-100"
                      data-show={d.count > 0}
                    >
                      {d.count}
                    </span>
                    <div
                      className={`w-full max-w-11 rounded-t-lg transition-all duration-500 ${
                        d.isToday ? "bg-brand" : "bg-brand/35 group-hover:bg-brand/60"
                      }`}
                      style={{ height: `${height}%` }}
                      title={`${d.date}: ${d.count} วิดีโอ`}
                    />
                    <span
                      className={`text-[11px] ${d.isToday ? "font-semibold text-ink" : "text-muted"}`}
                    >
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Alerts */}
        <Card className="lg:col-span-2" flush>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">แจ้งเตือนล่าสุด</h2>
              <p className="mt-0.5 text-[13px] text-muted">{alerts.length} รายการที่ต้องดู</p>
            </div>
            <Link
              href={`/t/${tenantSlug}/alerts`}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand transition hover:gap-1.5"
            >
              ทั้งหมด
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={CheckCircle2}
                title="ไม่มีแจ้งเตือน"
                description="ทุกสถานีทำงานปกติ ระบบจะแจ้งเตือนทันทีเมื่อพบปัญหา"
                className="border-0 bg-transparent py-8"
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {alerts.map((a) => (
                <li key={a.id} className="flex gap-3 px-5 py-3.5">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      a.severity === "critical"
                        ? "bg-danger"
                        : a.severity === "warning"
                          ? "bg-warning"
                          : "bg-info"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{a.message}</p>
                    <p className="mt-1 text-xs text-faint">
                      {formatDistanceToNow(a.createdAt, { locale: th, addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="mt-5" flush>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">วิดีโอล่าสุด</h2>
            <p className="mt-0.5 text-[13px] text-muted">การแพ็คที่บันทึกล่าสุด</p>
          </div>
          <Link
            href={`/t/${tenantSlug}/videos`}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand transition hover:gap-1.5"
          >
            ดูทั้งหมด
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={BellRing}
              title="ยังไม่มีการบันทึก"
              description="เริ่มบันทึกจากหน้าสถานีแพ็ค แล้ววิดีโอจะแสดงที่นี่"
              className="border-0 bg-transparent py-8"
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((rec) => (
              <li key={rec.id}>
                <Link
                  href={`/t/${tenantSlug}/videos/${rec.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-subtle/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-muted">
                    <Film size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{rec.order.orderNo}</p>
                    <p className="mt-0.5 truncate text-[13px] text-muted">
                      {rec.station.code} · {rec.employee.name}
                    </p>
                  </div>
                  <Badge tone={statusTone(rec.status)} dot className="hidden sm:inline-flex">
                    {statusLabel(rec.status)}
                  </Badge>
                  <time
                    className="shrink-0 text-xs text-faint tabular"
                    dateTime={rec.startedAt.toISOString()}
                  >
                    {format(rec.startedAt, "d MMM HH:mm", { locale: th })}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

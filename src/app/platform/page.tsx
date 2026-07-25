import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CircleCheck,
  Megaphone,
  Radio,
  WifiOff,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function PlatformOverviewPage() {
  const [tenantCount, activeTenants, agents, announcements, recentTenants] =
    await Promise.all([
      prisma.tenant.count({ where: { status: { not: "deleted" } } }),
      prisma.tenant.count({ where: { status: "active" } }),
      prisma.stationAgent.findMany({ include: { station: { include: { tenant: true } } } }),
      prisma.announcement.findMany({ where: { active: true }, take: 3 }),
      prisma.tenant.findMany({
        where: { status: { not: "deleted" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, slug: true, status: true, createdAt: true },
      }),
    ]);

  const onlineAgents = agents.filter((a) => a.online).length;
  const offlineAgents = agents.length - onlineAgents;

  return (
    <div>
      <PageHeader
        title="ภาพรวมแพลตฟอร์ม"
        description="สถานะ tenant, station agent และประกาศที่กำลังเผยแพร่"
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tenants ทั้งหมด" value={tenantCount} icon={Building2} />
        <Stat label="ใช้งานอยู่" value={activeTenants} icon={CircleCheck} tone="success" />
        <Stat label="Agents ออนไลน์" value={onlineAgents} icon={Radio} />
        <Stat
          label="Agents ออฟไลน์"
          value={offlineAgents}
          icon={WifiOff}
          tone={offlineAgents > 0 ? "danger" : "default"}
          hint={offlineAgents > 0 ? "ต้องตรวจสอบ" : "ทุกเครื่องเชื่อมต่อปกติ"}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card flush>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">Tenant ล่าสุด</h2>
            <Link
              href="/platform/tenants"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand transition hover:gap-1.5"
            >
              ทั้งหมด
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentTenants.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Building2}
                title="ยังไม่มี tenant"
                description="สร้าง tenant แรกเพื่อเริ่มให้บริการ"
                className="border-0 bg-transparent py-8"
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recentTenants.map((tenant) => (
                <li
                  key={tenant.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{tenant.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">{tenant.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={tenant.status === "active" ? "success" : "warning"} dot>
                      {tenant.status}
                    </Badge>
                    <time className="hidden text-xs text-faint sm:block">
                      {format(tenant.createdAt, "d MMM yy", { locale: th })}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card flush>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">ประกาศที่ใช้งาน</h2>
            <Link
              href="/platform/announcements"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand transition hover:gap-1.5"
            >
              จัดการ
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {announcements.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Megaphone}
                title="ไม่มีประกาศที่เผยแพร่"
                description="สร้างประกาศเพื่อแจ้งข่าวสารถึงทุก tenant"
                className="border-0 bg-transparent py-8"
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {announcements.map((a) => (
                <li key={a.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-ink">{a.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

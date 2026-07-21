import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Stat, Card, Button } from "@/components/ui";
import { startOfDay, subDays } from "date-fns";

export default async function ReportsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const tenantId = session.tenantId;
  const weekAgo = subDays(startOfDay(new Date()), 7);

  const [totalRecordings, weekRecordings, avgCompleteness, claimCount] = await Promise.all([
    prisma.recording.count({
      where: { tenantId, status: { in: ["ready", "warning"] } },
    }),
    prisma.recording.count({
      where: {
        tenantId,
        startedAt: { gte: weekAgo },
        status: { in: ["ready", "warning"] },
      },
    }),
    prisma.recording.aggregate({
      where: { tenantId, status: { in: ["ready", "warning"] } },
      _avg: { completenessScore: true },
    }),
    prisma.claimCase.count({ where: { tenantId, status: { in: ["open", "reviewing"] } } }),
  ]);

  return (
    <div>
      <PageHeader title="รายงาน" description="เมตริกการแพ็คและคุณภาพวิดีโอ" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="วิดีโอพร้อมใช้" value={totalRecordings} />
        <Stat label="7 วันล่าสุด" value={weekRecordings} />
        <Stat
          label="คะแนนครบถ้วนเฉลี่ย"
          value={`${Math.round(avgCompleteness._avg.completenessScore ?? 0)}%`}
          tone="success"
        />
        <Stat label="เคสเคลมเปิด" value={claimCount} tone={claimCount > 0 ? "danger" : "default"} />
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[var(--ink)]">ส่งออกรายงาน</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              ดาวน์โหลดข้อมูลวิดีโอและเคสเคลมเป็นไฟล์ CSV
            </p>
          </div>
          <Link href={`/api/t/${session.tenantSlug}/reports/export`}>
            <Button variant="primary">ดาวน์โหลด CSV</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

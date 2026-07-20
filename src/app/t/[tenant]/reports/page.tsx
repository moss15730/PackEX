import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Stat, Card } from "@/components/ui";
import { startOfDay, subDays } from "date-fns";

export default async function ReportsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const tenantId = session.tenantId;
  const weekAgo = subDays(startOfDay(new Date()), 7);

  const [totalRecordings, weekRecordings, avgCompleteness, claimCount] = await Promise.all([
    prisma.recording.count({ where: { tenantId, status: "ready" } }),
    prisma.recording.count({
      where: { tenantId, startedAt: { gte: weekAgo }, status: "ready" },
    }),
    prisma.recording.aggregate({
      where: { tenantId, status: "ready" },
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
        <h2 className="mb-2 font-semibold text-[var(--ink)]">สรุป</h2>
        <p className="text-sm text-[var(--muted)]">
          รายงานนี้สรุปจากข้อมูลในฐานข้อมูลของ tenant คุณเท่านั้น
          ส่งออก CSV/PDF จะพร้อมในเวอร์ชันถัดไป
        </p>
      </Card>
    </div>
  );
}

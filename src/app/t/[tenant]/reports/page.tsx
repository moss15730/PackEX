import { redirect } from "next/navigation";
import { CalendarRange, Download, FileWarning, Film, Gauge } from "lucide-react";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ButtonLink, Card, PageHeader, Progress, Stat } from "@/components/ui";
import { startOfDay, subDays } from "date-fns";

export default async function ReportsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId || !session.tenantSlug) return null;

  if (!can(session.role, "audit.view")) {
    redirect(`/t/${session.tenantSlug}/dashboard`);
  }

  const tenantId = session.tenantId;
  const weekAgo = subDays(startOfDay(new Date()), 7);

  const [totalRecordings, weekRecordings, avgCompleteness, claimCount] = await Promise.all([
    prisma.recording.count({ where: { tenantId, status: { in: ["ready", "warning"] } } }),
    prisma.recording.count({
      where: { tenantId, startedAt: { gte: weekAgo }, status: { in: ["ready", "warning"] } },
    }),
    prisma.recording.aggregate({
      where: { tenantId, status: { in: ["ready", "warning"] } },
      _avg: { completenessScore: true },
    }),
    prisma.claimCase.count({ where: { tenantId, status: { in: ["open", "reviewing"] } } }),
  ]);

  const avgScore = Math.round(avgCompleteness._avg.completenessScore ?? 0);

  return (
    <div>
      <PageHeader
        title="รายงาน"
        description="เมตริกการแพ็ค คุณภาพวิดีโอ และสถานะเคลมขององค์กร"
        actions={
          <ButtonLink
            href={`/api/t/${session.tenantSlug}/reports/export`}
            variant="primary"
            icon={Download}
          >
            ดาวน์โหลด CSV
          </ButtonLink>
        }
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="วิดีโอพร้อมใช้" value={totalRecordings} icon={Film} />
        <Stat
          label="7 วันล่าสุด"
          value={weekRecordings}
          icon={CalendarRange}
          hint="วิดีโอที่บันทึกในสัปดาห์นี้"
        />
        <Stat
          label="คะแนนครบถ้วนเฉลี่ย"
          value={`${avgScore}%`}
          icon={Gauge}
          tone={avgScore >= 80 ? "success" : "warning"}
        />
        <Stat
          label="เคสเคลมที่เปิดอยู่"
          value={claimCount}
          icon={FileWarning}
          tone={claimCount > 0 ? "danger" : "default"}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-[15px] font-semibold text-ink">คุณภาพหลักฐานโดยรวม</h2>
          <p className="mt-1 text-[13px] text-muted">
            คะแนนความครบถ้วนเฉลี่ยจากวิดีโอทั้งหมดที่พร้อมใช้งาน
          </p>

          <div className="mt-6 flex items-end gap-4">
            <span className="tabular text-5xl leading-none font-semibold tracking-tight text-ink">
              {avgScore}
              <span className="text-2xl text-muted">%</span>
            </span>
            <span className="pb-1.5 text-[13px] text-muted">
              จาก {totalRecordings.toLocaleString("th-TH")} วิดีโอ
            </span>
          </div>

          <Progress
            className="mt-5 h-2"
            value={avgScore}
            tone={avgScore >= 80 ? "brand" : "warning"}
          />
          <div className="mt-2 flex justify-between text-xs text-faint">
            <span>0%</span>
            <span>เป้าหมาย 80%</span>
            <span>100%</span>
          </div>
        </Card>

        <Card>
          <h2 className="text-[15px] font-semibold text-ink">ส่งออกข้อมูล</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            ดาวน์โหลดข้อมูลวิดีโอและเคสเคลมเป็นไฟล์ CSV
            เพื่อนำไปวิเคราะห์ต่อหรือเก็บเป็นหลักฐาน
          </p>
          <ButtonLink
            href={`/api/t/${session.tenantSlug}/reports/export`}
            variant="secondary"
            icon={Download}
            className="mt-5 w-full"
          >
            ดาวน์โหลด CSV
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}

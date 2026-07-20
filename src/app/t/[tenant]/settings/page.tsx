import Link from "next/link";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button } from "@/components/ui";
import { SettingsTheme } from "./theme-toggle";

export default async function SettingsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const [tenant, settings, stationCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { name: true, slug: true, locale: true, timezone: true, status: true },
    }),
    prisma.tenantSettings.findUnique({ where: { tenantId: session.tenantId } }),
    prisma.station.count({ where: { tenantId: session.tenantId } }),
  ]);

  if (!tenant || !settings) return null;

  const canManageStations = can(session.role, "stations.manage");

  return (
    <div>
      <PageHeader title="ตั้งค่า" description="การตั้งค่าองค์กรและนโยบายการอัดวิดีโอ" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-[var(--ink)]">ข้อมูลองค์กร</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">ชื่อ</dt>
              <dd>{tenant.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Slug</dt>
              <dd>{tenant.slug}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">ภาษา</dt>
              <dd>{tenant.locale}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Timezone</dt>
              <dd>{tenant.timezone}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-[var(--ink)]">จัดการสถานี</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">
            มีสถานีทั้งหมด {stationCount} แห่ง — เพิ่ม แก้ไข หรือลบสถานีแพ็ค
          </p>
          {canManageStations ? (
            <Link href={`/t/${session.tenantSlug}/stations`}>
              <Button type="button">ไปจัดการสถานี</Button>
            </Link>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              บัญชีนี้ไม่มีสิทธิ์จัดการสถานี —{" "}
              <Link
                href={`/t/${session.tenantSlug}/stations`}
                className="text-[var(--accent)] hover:underline"
              >
                ดูรายการสถานี
              </Link>
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-[var(--ink)]">นโยบายวิดีโอ</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">เวลาอัดขั้นต่ำ</dt>
              <dd>{settings.minRecordingSeconds} วินาที</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">กล้องขั้นต่ำ</dt>
              <dd>{settings.minCameras}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">ต้อง Snapshot</dt>
              <dd>{settings.snapshotRequired ? "ใช่" : "ไม่"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Preset</dt>
              <dd>{settings.videoPreset}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">หยุดอัตโนมัติเมื่อ idle</dt>
              <dd>{settings.idleAutoStopMinutes} นาที</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-[var(--ink)]">ธีม</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">
            ค่าเริ่มต้นองค์กร: {settings.theme}
          </p>
          <SettingsTheme defaultTheme={settings.theme} />
        </Card>
      </div>
    </div>
  );
}

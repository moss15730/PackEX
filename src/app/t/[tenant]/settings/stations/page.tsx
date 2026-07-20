import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { StationsManager } from "@/components/stations-manager";

export default async function SettingsStationsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const stations = await prisma.station.findMany({
    where: { tenantId: session.tenantId },
    include: {
      cameras: true,
      agent: true,
      _count: { select: { recordings: true } },
    },
    orderBy: { code: "asc" },
  });

  const canManage = can(session.role, "stations.manage");

  return (
    <div>
      <PageHeader
        title="จัดการสถานี"
        description="เพิ่ม แก้ไข ลบสถานีแพ็ค และเปิด Station Console"
      />
      <StationsManager
        tenantSlug={session.tenantSlug!}
        canManage={canManage}
        stations={stations.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          location: s.location,
          status: s.status,
          cameraCount: s.cameras.length,
          recordingCount: s._count.recordings,
          agentOnline: s.agent ? s.agent.online : null,
        }))}
      />
    </div>
  );
}

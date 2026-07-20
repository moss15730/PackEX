import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { VideosList } from "@/components/videos-list";

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const { q } = await searchParams;
  const tenantId = session.tenantId;

  const recordings = await prisma.recording.findMany({
    where: {
      tenantId,
      status: { not: "deleted" },
      deletedAt: null,
      ...(q
        ? {
            order: {
              orderNo: { contains: q, mode: "insensitive" },
            },
          }
        : {}),
    },
    include: {
      order: true,
      station: true,
      employee: true,
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader title="วิดีโอการแพ็ค" description="ค้นหาและตรวจสอบบันทึกทั้งหมด" />
      <VideosList
        tenantSlug={session.tenantSlug!}
        initialQ={q || ""}
        items={recordings.map((rec) => ({
          id: rec.id,
          orderNo: rec.order.orderNo,
          stationCode: rec.station.code,
          status: rec.status,
          completenessScore: rec.completenessScore,
          startedAt: rec.startedAt.toISOString(),
          employeeName: rec.employee.name,
        }))}
      />
    </div>
  );
}

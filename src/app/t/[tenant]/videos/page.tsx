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
    take: 200,
  });

  const grouped = new Map<string, typeof recordings>();
  for (const rec of recordings) {
    const list = grouped.get(rec.orderId) ?? [];
    list.push(rec);
    grouped.set(rec.orderId, list);
  }

  const items = [...grouped.values()]
    .map((recs) => {
      const sorted = [...recs].sort(
        (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
      );
      const latest = sorted[0];
      const avgScore = Math.round(
        sorted.reduce((sum, rec) => sum + rec.completenessScore, 0) / sorted.length,
      );
      const worstStatus = sorted.some((rec) => rec.status === "warning")
        ? "warning"
        : latest.status;

      return {
        id: latest.id,
        orderNo: latest.order.orderNo,
        stationCode: latest.station.code,
        status: worstStatus,
        completenessScore: avgScore,
        startedAt: latest.startedAt.toISOString(),
        employeeName: latest.employee.name,
        videoCount: sorted.length,
      };
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 50);

  return (
    <div>
      <PageHeader title="วิดีโอการแพ็ค" description="ค้นหาและตรวจสอบบันทึกทั้งหมด" />
      <VideosList
        tenantSlug={session.tenantSlug!}
        initialQ={q || ""}
        items={items}
      />
    </div>
  );
}

import Link from "next/link";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { VideosList } from "@/components/videos-list";
import { DeletedVideosList } from "@/components/deleted-videos-list";

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trash?: string }>;
}) {
  const session = await requireTenantSession();
  if (!session?.tenantId || !session.tenantSlug) return null;

  const { q, trash } = await searchParams;
  const tenantId = session.tenantId;
  const showTrash = trash === "1" || trash === "true";
  const canRestore = can(session.role, "video.delete");

  if (showTrash) {
    if (!canRestore) {
      return (
        <div>
          <PageHeader title="ถังลบวิดีโอ" description="ไม่มีสิทธิ์ดูรายการนี้" />
        </div>
      );
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { softDeleteDays: true },
    });
    const softDeleteDays = settings?.softDeleteDays ?? 14;

    const deleted = await prisma.recording.findMany({
      where: { tenantId, status: "deleted", deletedAt: { not: null } },
      include: { order: true, station: true, employee: true },
      orderBy: { deletedAt: "desc" },
      take: 100,
    });

    // Snapshot restore window once per request (server component).
    const now = Date.now(); // eslint-disable-line react-hooks/purity -- request-time clock
    const items = deleted.map((rec) => {
      const deletedAt = rec.deletedAt!;
      const restoreUntil = new Date(
        deletedAt.getTime() + softDeleteDays * 24 * 60 * 60 * 1000,
      );
      return {
        id: rec.id,
        orderNo: rec.order.orderNo,
        stationCode: rec.station.code,
        deletedAt: deletedAt.toISOString(),
        employeeName: rec.employee.name,
        completenessScore: rec.completenessScore,
        restoreUntil: restoreUntil.toISOString(),
        expired: now > restoreUntil.getTime(),
      };
    });

    return (
      <div>
        <PageHeader
          title="ถังลบวิดีโอ"
          description={`กู้คืนได้ภายใน ${softDeleteDays} วันหลังลบ`}
        />
        <DeletedVideosList
          tenantSlug={session.tenantSlug}
          items={items}
          softDeleteDays={softDeleteDays}
        />
      </div>
    );
  }

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
      {canRestore && (
        <p className="mb-4 text-sm">
          <Link
            href={`/t/${session.tenantSlug}/videos?trash=1`}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            เปิดถังลบวิดีโอ
          </Link>
        </p>
      )}
      <VideosList
        key={q || ""}
        tenantSlug={session.tenantSlug}
        initialQ={q || ""}
        items={items}
      />
    </div>
  );
}

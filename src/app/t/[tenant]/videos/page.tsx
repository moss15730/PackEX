import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { statusLabel } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

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
      ...(q
        ? {
            order: {
              orderNo: { contains: q },
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

      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหาเลขออเดอร์…"
          className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
        />
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">ออเดอร์</th>
              <th className="px-4 py-3 font-medium">สถานี</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">ครบถ้วน</th>
              <th className="px-4 py-3 font-medium">เวลา</th>
              <th className="px-4 py-3 font-medium">พนักงาน</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec) => (
              <tr key={rec.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/t/${session.tenantSlug}/videos/${rec.id}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {rec.order.orderNo}
                  </Link>
                </td>
                <td className="px-4 py-3">{rec.station.code}</td>
                <td className="px-4 py-3">
                  <Badge tone={rec.status === "ready" ? "success" : "neutral"}>
                    {statusLabel(rec.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      rec.completenessScore >= 80 ? "text-emerald-600" : "text-amber-600"
                    }
                  >
                    {rec.completenessScore}%
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {format(rec.startedAt, "d MMM HH:mm", { locale: th })}
                </td>
                <td className="px-4 py-3">{rec.employee.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recordings.length === 0 && (
          <p className="px-4 py-8 text-center text-[var(--muted)]">ไม่พบวิดีโอ</p>
        )}
      </Card>
    </div>
  );
}

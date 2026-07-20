import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { statusLabel } from "@/lib/utils";

export default async function StationPickerPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const stations = await prisma.station.findMany({
    where: {
      tenantId: session.tenantId,
      status: { notIn: ["offline", "blocked", "disk_full"] },
    },
    include: { cameras: { where: { active: true } } },
    orderBy: { code: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="เลือกสถานี"
        description="เลือกสถานีที่คุณอยู่ก่อนเข้า Station Console"
      />

      {stations.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">
            ไม่มีสถานีพร้อมใช้งาน —{" "}
            <Link
              href={`/t/${session.tenantSlug}/settings/stations`}
              className="text-[var(--accent)] hover:underline"
            >
              ดูรายการสถานี
            </Link>
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stations.map((station) => (
            <Link
              key={station.id}
              href={`/t/${session.tenantSlug}/station/${station.id}`}
              className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)] hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-center gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
                  {station.code}
                </h2>
                <Badge
                  tone={
                    station.status === "idle" || station.status === "ready"
                      ? "success"
                      : "warning"
                  }
                >
                  {statusLabel(station.status)}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--ink)]">{station.name}</p>
              {station.location && (
                <p className="mt-1 text-xs text-[var(--muted)]">{station.location}</p>
              )}
              <p className="mt-3 text-xs text-[var(--muted)]">
                กล้องใช้งานได้ {station.cameras.length} ตัว · คลิกเพื่อเข้า Console
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { Camera, ChevronRight, Radio } from "lucide-react";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { statusLabel } from "@/lib/utils";

function stationBadgeTone(status: string) {
  if (status === "idle" || status === "ready") return "success" as const;
  if (status === "disabled" || status === "blocked" || status === "offline") {
    return "danger" as const;
  }
  return "warning" as const;
}

function StationCard({
  tenantSlug,
  station,
}: {
  tenantSlug: string;
  station: {
    id: string;
    code: string;
    name: string;
    location: string | null;
    status: string;
    cameras: { id: string }[];
  };
}) {
  const isReady = station.status === "ready" || station.status === "idle";
  const badgeTone = stationBadgeTone(station.status);

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--ink)]">
              {station.code}
            </h2>
            <Badge tone={badgeTone} className="px-1.5 py-0 text-[10px]">
              {statusLabel(station.status)}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--ink)]">{station.name}</p>
          {station.location ? (
            <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">
              {station.location}
            </p>
          ) : null}
          {!isReady ? (
            <p className="mt-1 text-[10px] text-[var(--muted)]">ไม่พร้อมเข้าใช้งาน</p>
          ) : null}
        </div>
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--muted)] ${
            isReady
              ? "transition group-hover:bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-2))] group-hover:text-[var(--accent)]"
              : "opacity-50"
          }`}
        >
          <Radio className="h-3.5 w-3.5" strokeWidth={2.25} />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)] pt-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]">
          <Camera className="h-3 w-3" />
          {station.cameras.length} กล้อง
        </span>
        {isReady ? (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--muted)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-[var(--accent)]" />
        ) : null}
      </div>
    </>
  );

  if (isReady) {
    return (
      <Link
        href={`/t/${tenantSlug}/station/${station.id}`}
        className="group flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] hover:shadow-[var(--shadow-lg)]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      aria-disabled
      className="flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3.5 opacity-65 shadow-[var(--shadow)]"
    >
      {content}
    </div>
  );
}

export default async function StationPickerPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const stations = await prisma.station.findMany({
    where: { tenantId: session.tenantId },
    include: { cameras: { where: { active: true } } },
    orderBy: { code: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="เลือกสถานี"
        description="เลือกสถานีที่คุณอยู่ก่อนเข้า Station Console — เข้าใช้งานได้เฉพาะสถานีที่พร้อมใช้"
      />

      {stations.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">
            ยังไม่มีสถานี —{" "}
            <Link
              href={`/t/${session.tenantSlug}/settings/stations`}
              className="text-[var(--accent)] hover:underline"
            >
              ดูรายการสถานี
            </Link>
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {stations.map((station) => (
            <StationCard key={station.id} tenantSlug={session.tenantSlug!} station={station} />
          ))}
        </div>
      )}
    </div>
  );
}

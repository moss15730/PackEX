import Link from "next/link";
import { Camera, ChevronRight, MapPin, MonitorPlay, Radio, Settings } from "lucide-react";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { canAccessStation } from "@/lib/station-access";
import { statusLabel, statusTone, cn } from "@/lib/utils";

type StationCardData = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: string;
  cameras: { id: string }[];
};

function StationCard({
  tenantSlug,
  station,
}: {
  tenantSlug: string;
  station: StationCardData;
}) {
  const isReady = station.status === "ready" || station.status === "idle";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight text-ink">
              {station.code}
            </h2>
            <Badge tone={statusTone(station.status)} dot>
              {statusLabel(station.status)}
            </Badge>
          </div>
          <p className="mt-1 truncate text-[13px] text-ink-2">{station.name}</p>
        </div>

        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
            isReady
              ? "bg-subtle text-muted group-hover:bg-brand group-hover:text-brand-ink"
              : "bg-subtle text-faint",
          )}
        >
          <Radio size={16} strokeWidth={2.1} />
        </span>
      </div>

      {station.location ? (
        <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-muted">
          <MapPin size={12} />
          {station.location}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Camera size={13} />
          {station.cameras.length} กล้อง
        </span>
        {isReady ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
            เปิดคอนโซล
            <ChevronRight size={13} className="transition group-hover:translate-x-0.5" />
          </span>
        ) : (
          <span className="text-xs text-faint">ไม่พร้อมใช้งาน</span>
        )}
      </div>
    </>
  );

  if (isReady) {
    return (
      <Link
        href={`/t/${tenantSlug}/station/${station.id}`}
        className="card-interactive group flex flex-col rounded-xl border border-line bg-surface p-4 shadow-sm"
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      aria-disabled
      className="flex flex-col rounded-xl border border-line bg-surface p-4 opacity-65 shadow-sm"
    >
      {body}
    </div>
  );
}

export default async function StationPickerPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const [user, stations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { stationAccess: true },
    }),
    prisma.station.findMany({
      where: { tenantId: session.tenantId },
      include: { cameras: { where: { active: true } } },
      orderBy: { code: "asc" },
    }),
  ]);

  const accessible = stations.filter((station) =>
    canAccessStation(user?.stationAccess, station.id),
  );
  const readyCount = accessible.filter(
    (s) => s.status === "ready" || s.status === "idle",
  ).length;

  return (
    <div>
      <PageHeader
        title="สถานีแพ็ค"
        description="เลือกสถานีที่คุณอยู่เพื่อเปิด Station Console และเริ่มบันทึกการแพ็ค"
        actions={
          accessible.length > 0 ? (
            <Badge tone={readyCount > 0 ? "success" : "warning"} dot>
              พร้อมใช้งาน {readyCount}/{accessible.length}
            </Badge>
          ) : null
        }
      />

      {accessible.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title={stations.length === 0 ? "ยังไม่มีสถานี" : "ไม่มีสถานีที่คุณเข้าถึงได้"}
          description={
            stations.length === 0
              ? "สร้างสถานีแพ็คแรกของคุณเพื่อเริ่มบันทึกวิดีโอหลักฐาน"
              : "บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าถึงสถานีใด — ติดต่อผู้ดูแลระบบขององค์กร"
          }
          action={
            stations.length === 0 ? (
              <ButtonLink
                href={`/t/${session.tenantSlug}/settings/stations`}
                variant="primary"
                icon={Settings}
              >
                จัดการสถานี
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {accessible.map((station) => (
            <StationCard key={station.id} tenantSlug={session.tenantSlug!} station={station} />
          ))}
        </div>
      )}
    </div>
  );
}

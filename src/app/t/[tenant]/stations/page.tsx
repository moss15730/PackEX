import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { statusLabel } from "@/lib/utils";

export default async function StationsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const stations = await prisma.station.findMany({
    where: { tenantId: session.tenantId },
    include: { cameras: true, agent: true },
    orderBy: { code: "asc" },
  });

  return (
    <div>
      <PageHeader title="สถานีแพ็ค" description="สถานี กล้อง และสถานะ Station Agent" />

      <div className="space-y-4">
        {stations.map((station) => (
          <Card key={station.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
                    {station.code} — {station.name}
                  </h2>
                  <Badge tone={station.status === "idle" || station.status === "ready" ? "success" : "warning"}>
                    {statusLabel(station.status)}
                  </Badge>
                </div>
                {station.location && (
                  <p className="mt-1 text-sm text-[var(--muted)]">{station.location}</p>
                )}
              </div>
              <Link
                href={`/t/${session.tenantSlug}/station`}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                เปิด Console
              </Link>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  กล้อง ({station.cameras.length})
                </h3>
                <ul className="space-y-1 text-sm">
                  {station.cameras.map((cam) => (
                    <li key={cam.id} className="flex items-center justify-between">
                      <span>{cam.name}</span>
                      <Badge tone={cam.status === "online" ? "success" : "danger"}>
                        {statusLabel(cam.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Station Agent
                </h3>
                {station.agent ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-[var(--muted)]">สถานะ</dt>
                    <dd>
                      <Badge tone={station.agent.online ? "success" : "danger"}>
                        {station.agent.online ? "ออนไลน์" : "ออฟไลน์"}
                      </Badge>
                    </dd>
                    <dt className="text-[var(--muted)]">เวอร์ชัน</dt>
                    <dd>{station.agent.version}</dd>
                    <dt className="text-[var(--muted)]">CPU</dt>
                    <dd>{station.agent.cpuPercent?.toFixed(0) ?? "—"}%</dd>
                    <dt className="text-[var(--muted)]">ดิสก์ว่าง</dt>
                    <dd>{station.agent.diskFreeGb?.toFixed(1) ?? "—"} GB</dd>
                    <dt className="text-[var(--muted)]">คิวอัปโหลด</dt>
                    <dd>{station.agent.queueSize}</dd>
                    <dt className="text-[var(--muted)]">Time drift</dt>
                    <dd>{station.agent.timeDriftMs} ms</dd>
                  </dl>
                ) : (
                  <p className="text-sm text-[var(--muted)]">ยังไม่ติดตั้ง Agent</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

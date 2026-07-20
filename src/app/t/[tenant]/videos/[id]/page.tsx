import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantSession, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDriveViewLink, isDriveConfigured } from "@/lib/drive";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { statusLabel, formatBytes } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const { id } = await params;

  const recording = await prisma.recording.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      order: true,
      station: true,
      employee: true,
      files: true,
      snapshots: true,
      markers: { orderBy: { atSec: "asc" } },
      shareLinks: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!recording) notFound();

  const shareLink = recording.shareLinks[0];
  const canShare = can(session.role, "video.share");
  const driveReady = isDriveConfigured();

  const filesWithLinks = await Promise.all(
    recording.files.map(async (file) => ({
      ...file,
      viewLink: await getDriveViewLink(file.storagePath),
    })),
  );

  return (
    <div>
      <PageHeader
        title={recording.order.orderNo}
        description={`${recording.station.code} · ${format(recording.startedAt, "d MMM yyyy HH:mm", { locale: th })}`}
        actions={
          <Link href={`/t/${session.tenantSlug}/videos`}>
            <Button variant="outline">กลับ</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={recording.status === "ready" ? "success" : "neutral"}>
          {statusLabel(recording.status)}
        </Badge>
        <Badge tone={recording.completenessScore >= 80 ? "success" : "warning"}>
          ครบถ้วน {recording.completenessScore}%
        </Badge>
        {recording.legalHold && <Badge tone="danger">Legal Hold</Badge>}
        <Badge tone={driveReady ? "success" : "warning"}>
          {driveReady ? "Google Drive พร้อม" : "Drive ยังไม่ตั้งค่า"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filesWithLinks.map((file) => (
          <Card key={file.id} className="p-0 overflow-hidden">
            <div className="flex aspect-video items-center justify-center bg-[var(--surface-2)]">
              <div className="text-center px-4">
                <div className="text-4xl">▶</div>
                <p className="mt-2 text-sm text-[var(--muted)]">{file.cameraLabel}</p>
                <p className="text-xs text-[var(--muted)]">{formatBytes(file.sizeBytes)}</p>
                {file.viewLink ? (
                  <a
                    href={file.viewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-[var(--accent)] underline"
                  >
                    เปิดใน Google Drive
                  </a>
                ) : (
                  <p className="mt-3 text-xs text-[var(--muted)] break-all">{file.storagePath}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-[var(--ink)]">การตรวจสอบ Hash</h2>
          <ul className="space-y-2 text-xs font-mono">
            {recording.files.map((f) => (
              <li key={f.id} className="break-all text-[var(--muted)]">
                {f.cameraLabel}: {f.sha256.slice(0, 16)}…
              </li>
            ))}
          </ul>
          <Button variant="secondary" className="mt-4">
            ตรวจสอบความถูกต้อง
          </Button>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-[var(--ink)]">แชร์ลิงก์</h2>
          {shareLink && canShare ? (
            <div className="text-sm">
              <p className="text-[var(--muted)]">
                หมดอายุ {format(shareLink.expiresAt, "d MMM yyyy", { locale: th })}
              </p>
              <code className="mt-2 block rounded bg-[var(--surface-2)] px-2 py-1 text-xs">
                /share/{shareLink.token}
              </code>
              <p className="mt-1 text-xs text-[var(--muted)]">
                เปิดแล้ว {shareLink.openCount}
                {shareLink.maxOpens ? ` / ${shareLink.maxOpens}` : ""} ครั้ง
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">ยังไม่มีลิงก์แชร์</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-[var(--ink)]">Timeline Markers</h2>
          <ul className="space-y-2 text-sm">
            {recording.markers.map((m) => (
              <li key={m.id} className="flex justify-between">
                <span>{m.label}</span>
                <span className="text-[var(--muted)]">{m.atSec}s</span>
              </li>
            ))}
            {recording.markers.length === 0 && (
              <li className="text-[var(--muted)]">ไม่มี marker</li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-[var(--ink)]">Snapshots</h2>
          <ul className="space-y-2 text-sm">
            {recording.snapshots.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span className="truncate">{s.storagePath}</span>
                <span className="text-[var(--muted)]">
                  {format(s.takenAt, "HH:mm:ss")}
                </span>
              </li>
            ))}
            {recording.snapshots.length === 0 && (
              <li className="text-[var(--muted)]">ไม่มี snapshot</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

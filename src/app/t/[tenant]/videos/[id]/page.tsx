import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantSession, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  driveIdFromStorage,
  getDriveViewLink,
  getPlaybackInfo,
  isDriveConfigured,
  localPathFromStorage,
} from "@/lib/drive";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { statusLabel, formatBytes } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { existsSync } from "fs";

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
    recording.files.map(async (file) => {
      const driveLink = await getDriveViewLink(file.storagePath);
      const playback = getPlaybackInfo(file.storagePath, {
        tenantSlug: session.tenantSlug!,
        fileId: file.id,
      });

      // Prefer local <video> when the mirrored file exists on disk
      const localCandidates = [file.thumbnailPath, file.storagePath].filter(Boolean) as string[];
      const hasLocal = localCandidates.some((p) => {
        const full = localPathFromStorage(p);
        return full ? existsSync(full) : false;
      });

      const localSrc = hasLocal
        ? `/api/t/${session.tenantSlug}/media/${file.id}`
        : null;

      return {
        ...file,
        viewLink: driveLink,
        driveId: driveIdFromStorage(file.storagePath),
        localSrc,
        drivePreviewSrc: playback.kind === "drive" ? playback.src : null,
      };
    }),
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
          {driveReady ? "Google Drive พร้อม" : "Drive ยังไม่ตั้งค่า — เก็บในเครื่อง"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filesWithLinks.map((file) => (
          <Card key={file.id} className="overflow-hidden p-0">
            <div className="aspect-video bg-black">
              {file.localSrc ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full"
                  src={file.localSrc}
                />
              ) : file.drivePreviewSrc ? (
                <iframe
                  title={file.cameraLabel}
                  src={file.drivePreviewSrc}
                  className="h-full w-full border-0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/70">
                  ไม่มีไฟล์วิดีโอให้เล่น
                  <br />
                  (อาจเป็นข้อมูลจำลองจาก seed)
                </div>
              )}
            </div>
            <div className="space-y-1 p-4">
              <p className="font-medium text-[var(--ink)]">{file.cameraLabel}</p>
              <p className="text-xs text-[var(--muted)]">{formatBytes(file.sizeBytes)}</p>
              {file.viewLink && (
                <a
                  href={file.viewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm font-medium text-[var(--accent)] underline"
                >
                  เปิดใน Google Drive
                </a>
              )}
              {!file.localSrc && !file.drivePreviewSrc && (
                <p className="break-all text-xs text-[var(--muted)]">{file.storagePath}</p>
              )}
            </div>
          </Card>
        ))}
        {filesWithLinks.length === 0 && (
          <Card>
            <p className="text-sm text-[var(--muted)]">ยังไม่มีไฟล์วิดีโอสำหรับรายการนี้</p>
          </Card>
        )}
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

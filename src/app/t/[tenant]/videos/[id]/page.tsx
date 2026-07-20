import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantSession, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStorageConfigured, resolvePlaybackUrl } from "@/lib/storage";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { VideoActions } from "@/components/video-actions";
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
    where: {
      id,
      tenantId: session.tenantId,
      status: { not: "deleted" },
    },
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
  const canDelete = can(session.role, "video.delete");
  const storageReady = isStorageConfigured();

  const filesWithLinks = await Promise.all(
    recording.files.map(async (file) => {
      const playback = await resolvePlaybackUrl({
        storagePath: file.storagePath,
        thumbnailPath: file.thumbnailPath,
        tenantSlug: session.tenantSlug!,
        fileId: file.id,
      });

      return {
        ...file,
        playSrc: playback.src,
        playKind: playback.kind,
        isSupabase: file.storagePath.startsWith("supabase:"),
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
        <Badge tone={storageReady ? "success" : "warning"}>
          {storageReady ? "Supabase Storage พร้อม" : "Storage ยังไม่ตั้งค่า — เก็บในเครื่อง"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filesWithLinks.map((file) => (
          <Card key={file.id} className="overflow-hidden p-0">
            <div className="aspect-video bg-black">
              {file.playSrc && file.playKind !== "none" ? (
                file.playSrc.includes("drive.google.com") ? (
                  <iframe
                    title={file.cameraLabel}
                    src={file.playSrc}
                    className="h-full w-full border-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full"
                    src={file.playSrc}
                  />
                )
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
              {file.isSupabase && (
                <p className="text-xs text-emerald-600">เก็บบน Supabase Storage</p>
              )}
              {!file.playSrc && (
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

      <VideoActions
        tenantSlug={session.tenantSlug!}
        recordingId={recording.id}
        recordingStatus={recording.status}
        canDelete={canDelete}
        canShare={canShare}
        initialShare={
          shareLink
            ? {
                token: shareLink.token,
                path: `/share/${shareLink.token}`,
                expiresAt: shareLink.expiresAt.toISOString(),
                openCount: shareLink.openCount,
                maxOpens: shareLink.maxOpens,
              }
            : null
        }
      />

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

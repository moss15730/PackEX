import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, HardDrive, Clock, User, MapPin, ImageIcon } from "lucide-react";
import { requireTenantSession, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStorageConfigured, resolvePlaybackUrl } from "@/lib/storage";
import { PageHeader, Badge, Button } from "@/components/ui";
import { VideoActions } from "@/components/video-actions";
import { HashVerifyButton } from "@/components/hash-verify-button";
import { statusLabel, formatBytes } from "@/lib/utils";
import { addSeconds, format } from "date-fns";
import { th } from "date-fns/locale";

async function loadFilesWithLinks(
  files: {
    id: string;
    cameraLabel: string;
    storagePath: string;
    thumbnailPath: string | null;
    sizeBytes: number;
    sha256: string;
  }[],
  tenantSlug: string,
) {
  return Promise.all(
    files.map(async (file) => {
      const playback = await resolvePlaybackUrl({
        storagePath: file.storagePath,
        thumbnailPath: file.thumbnailPath,
        tenantSlug,
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
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const { id } = await params;

  const anchor = await prisma.recording.findFirst({
    where: {
      id,
      tenantId: session.tenantId,
      status: { not: "deleted" },
    },
    include: { order: true },
  });

  if (!anchor) notFound();

  const orderRecordings = await prisma.recording.findMany({
    where: {
      tenantId: session.tenantId,
      orderId: anchor.orderId,
      status: { not: "deleted" },
      deletedAt: null,
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
    orderBy: { startedAt: "asc" },
  });

  const canShare = can(session.role, "video.share");
  const canDelete = can(session.role, "video.delete");
  const storageReady = isStorageConfigured();

  const recordingsWithFiles = await Promise.all(
    orderRecordings.map(async (recording, index) => ({
      index,
      recording,
      filesWithLinks: await loadFilesWithLinks(recording.files, session.tenantSlug!),
    })),
  );

  const videoCount = orderRecordings.length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={anchor.order.orderNo}
        description={
          videoCount > 1
            ? `${videoCount} วิดีโอในออเดอร์เดียวกัน`
            : `บันทึกวิดีโอการแพ็ค · ${format(anchor.startedAt, "d MMM yyyy HH:mm", { locale: th })}`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {can(session.role, "claims.manage") && (
              <Link
                href={`/t/${session.tenantSlug}/claims?orderNo=${encodeURIComponent(anchor.order.orderNo)}&recordingId=${anchor.id}`}
              >
                <Button variant="secondary">สร้างเคสเคลม</Button>
              </Link>
            )}
            <Link href={`/t/${session.tenantSlug}/videos`}>
              <Button variant="outline">กลับ</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{videoCount} วิดีโอ</Badge>
        <Badge tone={storageReady ? "success" : "warning"}>
          {storageReady ? "Storage พร้อม" : "Storage ยังไม่ตั้งค่า"}
        </Badge>
      </div>

      <div className="space-y-5">
        {recordingsWithFiles.map(({ index, recording, filesWithLinks }) => {
          const shareLink = recording.shareLinks[0];

          return (
            <article
              key={recording.id}
              className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5 md:px-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--ink)]">
                      วิดีโอ {index + 1}
                    </h2>
                    {recording.id === anchor.id && (
                      <Badge tone="info">รายการที่เปิด</Badge>
                    )}
                  </div>
                  <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                      <dt className="sr-only">สถานี</dt>
                      <dd>{recording.station.code}</dd>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0 opacity-70" />
                      <dt className="sr-only">เวลา</dt>
                      <dd>{format(recording.startedAt, "d MMM yyyy HH:mm", { locale: th })}</dd>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 shrink-0 opacity-70" />
                      <dt className="sr-only">พนักงาน</dt>
                      <dd>{recording.employee.name}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={recording.status === "ready" ? "success" : "neutral"}>
                    {statusLabel(recording.status)}
                  </Badge>
                  <Badge tone={recording.completenessScore >= 80 ? "success" : "warning"}>
                    ครบถ้วน {recording.completenessScore}%
                  </Badge>
                  {recording.legalHold && <Badge tone="danger">Legal Hold</Badge>}
                </div>
              </header>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 border-[var(--border)] lg:border-r">
                  {filesWithLinks.length === 0 ? (
                    <div className="flex h-40 items-center justify-center bg-[var(--surface-2)] px-4 text-center text-sm text-[var(--muted)]">
                      ยังไม่มีไฟล์วิดีโอสำหรับรายการนี้
                    </div>
                  ) : (
                    filesWithLinks.map((file, fileIndex) => (
                      <div
                        key={file.id}
                        className={fileIndex > 0 ? "border-t border-[var(--border)]" : ""}
                      >
                        <div className="bg-black">
                          <div className="mx-auto aspect-video w-full max-w-3xl">
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
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs md:px-4">
                          <span className="flex items-center gap-1 font-medium text-[var(--ink)]">
                            <Camera className="h-3 w-3 text-[var(--muted)]" />
                            {file.cameraLabel}
                          </span>
                          <span className="text-[var(--muted)]">{formatBytes(file.sizeBytes)}</span>
                          <span className="font-mono text-[10px] text-[var(--muted)]" title={file.sha256}>
                            sha256:{file.sha256.slice(0, 12)}…
                          </span>
                          {file.isSupabase && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <HardDrive className="h-3 w-3" />
                              เก็บบน Storage
                            </span>
                          )}
                          {!file.playSrc && (
                            <span className="break-all text-[var(--muted)]">{file.storagePath}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {recording.markers.length > 0 && (
                    <div className="border-t border-[var(--border)] px-3 py-3 md:px-4">
                      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                        ไทม์ไลน์
                      </h3>
                      <ul className="space-y-1.5">
                        {recording.markers.map((m) => {
                          const at = addSeconds(recording.startedAt, m.atSec);
                          return (
                            <li
                              key={m.id}
                              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md bg-[var(--surface-2)] px-2.5 py-1.5 text-sm"
                            >
                              <span className="font-medium text-[var(--ink)]">{m.label}</span>
                              <time
                                dateTime={at.toISOString()}
                                className="text-xs text-[var(--muted)]"
                              >
                                {format(at, "d MMM yyyy HH:mm:ss", { locale: th })}
                              </time>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                <aside className="flex flex-col gap-3 p-3 lg:bg-[var(--surface-2)]/40">
                  <HashVerifyButton
                    tenantSlug={session.tenantSlug!}
                    recordingId={recording.id}
                  />
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

                  <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
                    <div className="mb-2 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
                      <h3 className="text-xs font-semibold text-[var(--ink)]">Snapshots</h3>
                      <span className="ml-auto text-[11px] text-[var(--muted)]">
                        {recording.snapshots.length}
                      </span>
                    </div>
                    {recording.snapshots.length === 0 ? (
                      <p className="text-xs text-[var(--muted)]">ไม่มี snapshot</p>
                    ) : (
                      <ul className="max-h-32 space-y-1.5 overflow-y-auto text-xs">
                        {recording.snapshots.map((s) => (
                          <li key={s.id} className="flex justify-between gap-2">
                            <span className="truncate text-[var(--ink)]">{s.storagePath}</span>
                            <span className="shrink-0 text-[var(--muted)]">
                              {format(s.takenAt, "d MMM yyyy HH:mm:ss", { locale: th })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </aside>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

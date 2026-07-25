import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Clock,
  FileWarning,
  HardDrive,
  ImageIcon,
  MapPin,
  User,
  VideoOff,
} from "lucide-react";
import { requireTenantSession, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStorageConfigured, resolvePlaybackUrl } from "@/lib/storage";
import { Badge, ButtonLink, PageHeader, Progress } from "@/components/ui";
import { VideoActions } from "@/components/video-actions";
import { HashVerifyButton } from "@/components/hash-verify-button";
import { statusLabel, statusTone, formatBytes } from "@/lib/utils";
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
    where: { id, tenantId: session.tenantId, status: { not: "deleted" } },
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
    <div>
      <PageHeader
        eyebrow="วิดีโอการแพ็ค"
        title={anchor.order.orderNo}
        description={
          videoCount > 1
            ? `${videoCount} วิดีโอในออเดอร์เดียวกัน · เริ่ม ${format(anchor.startedAt, "d MMM yyyy HH:mm", { locale: th })}`
            : `บันทึกเมื่อ ${format(anchor.startedAt, "d MMM yyyy HH:mm", { locale: th })}`
        }
        actions={
          <>
            {can(session.role, "claims.manage") && (
              <ButtonLink
                href={`/t/${session.tenantSlug}/claims?orderNo=${encodeURIComponent(anchor.order.orderNo)}&recordingId=${anchor.id}`}
                variant="secondary"
                icon={FileWarning}
              >
                สร้างเคสเคลม
              </ButtonLink>
            )}
            <ButtonLink
              href={`/t/${session.tenantSlug}/videos`}
              variant="ghost"
              icon={ArrowLeft}
            >
              กลับ
            </ButtonLink>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge icon={Camera}>{videoCount} วิดีโอ</Badge>
        <Badge tone={storageReady ? "success" : "warning"} dot>
          {storageReady ? "Storage พร้อมใช้งาน" : "Storage ยังไม่ตั้งค่า"}
        </Badge>
      </div>

      <div className="space-y-6">
        {recordingsWithFiles.map(({ index, recording, filesWithLinks }) => {
          const shareLink = recording.shareLinks[0];

          return (
            <article
              key={recording.id}
              className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
            >
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold text-ink">วิดีโอ {index + 1}</h2>
                    {recording.id === anchor.id && <Badge tone="brand">รายการที่เปิด</Badge>}
                  </div>
                  <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} />
                      <dt className="sr-only">สถานี</dt>
                      <dd>{recording.station.code}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      <dt className="sr-only">เวลา</dt>
                      <dd>{format(recording.startedAt, "d MMM yyyy HH:mm", { locale: th })}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User size={12} />
                      <dt className="sr-only">พนักงาน</dt>
                      <dd>{recording.employee.name}</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(recording.status)} dot>
                    {statusLabel(recording.status)}
                  </Badge>
                  {recording.legalHold && <Badge tone="danger">Legal hold</Badge>}
                  <div className="flex items-center gap-2">
                    <Progress
                      value={recording.completenessScore}
                      tone={recording.completenessScore >= 80 ? "brand" : "warning"}
                      className="w-14"
                    />
                    <span className="tabular text-xs font-medium text-ink-2">
                      {recording.completenessScore}%
                    </span>
                  </div>
                </div>
              </header>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0 lg:border-r lg:border-line">
                  {filesWithLinks.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 bg-subtle/50 px-4 text-center">
                      <VideoOff size={20} className="text-faint" />
                      <p className="text-sm text-muted">ยังไม่มีไฟล์วิดีโอสำหรับรายการนี้</p>
                    </div>
                  ) : (
                    filesWithLinks.map((file, fileIndex) => (
                      <div key={file.id} className={fileIndex > 0 ? "border-t border-line" : ""}>
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
                              <div className="flex h-full flex-col items-center justify-center gap-1.5 px-4 text-center text-sm text-white/70">
                                <VideoOff size={20} className="opacity-60" />
                                ไม่มีไฟล์วิดีโอให้เล่น
                                <span className="text-xs text-white/45">
                                  (อาจเป็นข้อมูลจำลองจาก seed)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-xs sm:px-5">
                          <span className="flex items-center gap-1.5 font-medium text-ink">
                            <Camera size={13} className="text-muted" />
                            {file.cameraLabel}
                          </span>
                          <span className="tabular text-muted">{formatBytes(file.sizeBytes)}</span>
                          <span
                            className="font-mono text-[10px] text-faint"
                            title={file.sha256}
                          >
                            sha256:{file.sha256.slice(0, 12)}…
                          </span>
                          {file.isSupabase && (
                            <span className="flex items-center gap-1.5 text-success-ink">
                              <HardDrive size={12} />
                              เก็บบน Storage
                            </span>
                          )}
                          {!file.playSrc && (
                            <span className="break-all text-faint">{file.storagePath}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {recording.markers.length > 0 && (
                    <div className="border-t border-line px-4 py-4 sm:px-5">
                      <h3 className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
                        ไทม์ไลน์เหตุการณ์
                      </h3>
                      <ol className="relative space-y-0">
                        <span
                          className="absolute top-3 bottom-3 left-[0.3rem] w-px bg-line"
                          aria-hidden
                        />
                        {recording.markers.map((m) => {
                          const at = addSeconds(recording.startedAt, m.atSec);
                          return (
                            <li key={m.id} className="relative flex items-baseline gap-3 py-2">
                              <span className="relative z-10 h-2.5 w-2.5 shrink-0 translate-y-1 rounded-full bg-brand ring-4 ring-surface" />
                              <span className="flex-1 text-sm font-medium text-ink">
                                {m.label}
                              </span>
                              <time
                                dateTime={at.toISOString()}
                                className="tabular shrink-0 text-xs text-muted"
                              >
                                {format(at, "HH:mm:ss", { locale: th })}
                              </time>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </div>

                <aside className="flex flex-col gap-3 bg-subtle/40 p-4">
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

                  <section className="rounded-xl border border-line bg-surface p-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={14} className="text-muted" />
                      <h3 className="text-[13px] font-semibold text-ink">Snapshots</h3>
                      <span className="tabular ml-auto text-[11px] text-muted">
                        {recording.snapshots.length}
                      </span>
                    </div>
                    {recording.snapshots.length === 0 ? (
                      <p className="mt-2.5 text-xs text-muted">ไม่มี snapshot สำหรับรายการนี้</p>
                    ) : (
                      <ul className="mt-3 max-h-36 space-y-2 overflow-y-auto text-xs">
                        {recording.snapshots.map((s) => (
                          <li key={s.id} className="flex justify-between gap-2">
                            <span className="truncate text-ink-2">{s.storagePath}</span>
                            <span className="tabular shrink-0 text-muted">
                              {format(s.takenAt, "d MMM HH:mm:ss", { locale: th })}
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

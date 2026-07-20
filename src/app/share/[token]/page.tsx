import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PackExWordmark } from "@/components/brand";
import { Badge, Card } from "@/components/ui";
import { formatBytes, statusLabel } from "@/lib/utils";
import { createSignedUrl } from "@/lib/storage";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      recording: {
        include: {
          order: true,
          station: true,
          files: true,
          markers: { orderBy: { atSec: "asc" } },
        },
      },
    },
  });

  if (!link) notFound();

  if (link.recording.status === "deleted" || link.recording.deletedAt) {
    notFound();
  }

  const expired = link.expiresAt < new Date();
  const maxReached = link.maxOpens != null && link.openCount >= link.maxOpens;

  if (!expired && !maxReached) {
    await prisma.shareLink.update({
      where: { id: link.id },
      data: { openCount: { increment: 1 } },
    });
    await prisma.shareLinkAccess.create({
      data: { shareLinkId: link.id },
    });
  }

  const rec = link.recording;

  const filesWithSrc = await Promise.all(
    rec.files.map(async (file) => {
      let playSrc: string | null = null;
      if (file.storagePath.startsWith("supabase:")) {
        playSrc = await createSignedUrl(file.storagePath, 60 * 60);
      } else if (file.storagePath.startsWith("gdrive:")) {
        playSrc = `https://drive.google.com/file/d/${file.storagePath.slice("gdrive:".length)}/preview`;
      }
      return { ...file, playSrc };
    }),
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <PackExWordmark className="mb-8" />

        {expired ? (
          <Card className="text-center">
            <h1 className="text-xl font-semibold text-rose-600">ลิงก์หมดอายุแล้ว</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              ลิงก์นี้หมดอายุเมื่อ {format(link.expiresAt, "d MMM yyyy HH:mm", { locale: th })}
            </p>
          </Card>
        ) : maxReached ? (
          <Card className="text-center">
            <h1 className="text-xl font-semibold text-rose-600">เปิดครบจำนวนที่กำหนดแล้ว</h1>
          </Card>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone="info">ลิงก์แชร์</Badge>
              <Badge tone={rec.status === "ready" ? "success" : "neutral"}>
                {statusLabel(rec.status)}
              </Badge>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
              {rec.order.orderNo}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {rec.station.code} · ครบถ้วน {rec.completenessScore}%
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {filesWithSrc.map((file) => (
                <Card key={file.id} className="overflow-hidden p-0">
                  <div className="aspect-video bg-black">
                    {file.playSrc ? (
                      file.playSrc.includes("drive.google.com") ? (
                        <iframe
                          title={file.cameraLabel}
                          src={file.playSrc}
                          className="h-full w-full border-0"
                          allow="autoplay"
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
                      <div className="flex h-full items-center justify-center text-center text-sm text-white/70">
                        {file.cameraLabel}
                        <br />
                        {formatBytes(file.sizeBytes)}
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-sm">
                    <p className="font-medium">{file.cameraLabel}</p>
                    <p className="text-xs text-[var(--muted)]">{formatBytes(file.sizeBytes)}</p>
                  </div>
                </Card>
              ))}
            </div>

            {rec.markers.length > 0 && (
              <Card className="mt-4">
                <h2 className="mb-2 font-semibold">Timeline</h2>
                <ul className="space-y-1 text-sm">
                  {rec.markers.map((m) => (
                    <li key={m.id} className="flex justify-between">
                      <span>{m.label}</span>
                      <span className="text-[var(--muted)]">{m.atSec}s</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

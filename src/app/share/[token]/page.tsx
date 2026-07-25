import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  Camera,
  Clock,
  MapPin,
  User,
  Package,
  Timer,
  ShieldCheck,
  Link2,
  CalendarClock,
  CircleSlash,
  Hourglass,
  ImageIcon,
  ListTree,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PackExWordmark } from "@/components/brand";
import { Badge, Card, EmptyState, Progress } from "@/components/ui";
import { ShareUnlockForm } from "@/components/share-unlock-form";
import { formatBytes, statusLabel } from "@/lib/utils";
import { createSignedUrl } from "@/lib/storage";
import { hasValidShareUnlock } from "@/lib/share-access";
import { addSeconds, format, formatDistanceStrict } from "date-fns";
import { th } from "date-fns/locale";

function formatDuration(sec: number | null | undefined) {
  if (sec == null || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s} วินาที`;
  return `${m} นาที ${s.toString().padStart(2, "0")} วินาที`;
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-muted">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted">{label}</dt>
        <dd className="mt-1 truncate text-sm font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

function ShareShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="aurora min-h-[100dvh]">
      <header className="glass sticky top-0 z-30 border-b border-line/60">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <PackExWordmark size="sm" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-[11px] font-medium text-muted">
            <ShieldCheck size={12} strokeWidth={2.2} />
            หลักฐานวิดีโอการแพ็ค
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      tenant: { select: { name: true, slug: true } },
      recording: {
        include: {
          order: true,
          station: true,
          employee: { select: { name: true, email: true } },
          files: { orderBy: { createdAt: "asc" } },
          markers: { orderBy: { atSec: "asc" } },
          snapshots: { orderBy: { takenAt: "asc" } },
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
  const needsPassword = Boolean(link.passwordHash);
  const unlocked = needsPassword ? await hasValidShareUnlock(token) : true;

  if (!expired && !maxReached && unlocked) {
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";

    await prisma.shareLink.update({
      where: { id: link.id },
      data: { openCount: { increment: 1 } },
    });
    await prisma.shareLinkAccess.create({
      data: {
        shareLinkId: link.id,
        ip,
        watermark: `PackEX · ${link.tenant.slug} · ${ip} · ${new Date().toISOString()}`,
      },
    });
  }

  const rec = link.recording;
  const watermarkLabel = `PackEX · ${link.tenant.name} · ${format(new Date(), "d MMM yyyy HH:mm", { locale: th })}`;

  if (!expired && !maxReached && needsPassword && !unlocked) {
    return (
      <div className="aurora flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <PackExWordmark />
        </div>
        <ShareUnlockForm token={token} />
      </div>
    );
  }

  if (expired || maxReached) {
    return (
      <ShareShell>
        <Card className="mx-auto max-w-md p-8 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-ink">
            {expired ? (
              <Hourglass size={24} strokeWidth={1.9} />
            ) : (
              <CircleSlash size={24} strokeWidth={1.9} />
            )}
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
            {expired ? "ลิงก์หมดอายุแล้ว" : "เปิดครบจำนวนที่กำหนดแล้ว"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {expired
              ? `หมดอายุเมื่อ ${format(link.expiresAt, "d MMMM yyyy เวลา HH:mm น.", { locale: th })}`
              : `เปิดแล้ว ${link.openCount}${link.maxOpens != null ? ` / ${link.maxOpens}` : ""} ครั้ง`}
          </p>
          <p className="mt-5 text-xs text-faint">
            ติดต่อผู้ส่งหลักฐานเพื่อขอลิงก์ใหม่
          </p>
        </Card>
      </ShareShell>
    );
  }

  const durationSec =
    rec.durationSec ??
    (rec.endedAt
      ? Math.max(0, Math.floor((rec.endedAt.getTime() - rec.startedAt.getTime()) / 1000))
      : null);

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

  const totalBytes = filesWithSrc.reduce((sum, f) => sum + f.sizeBytes, 0);

  return (
    <ShareShell>
      <div className="space-y-10">
        {/* Summary */}
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand" dot>
              ลิงก์แชร์หลักฐาน
            </Badge>
            <Badge tone={rec.status === "ready" ? "success" : "warning"}>
              {statusLabel(rec.status)}
            </Badge>
            {rec.legalHold ? <Badge tone="danger">Legal hold</Badge> : null}
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {rec.order.orderNo}
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted">
            บันทึกวิดีโอตอนแพ็คสินค้าจากสถานี {rec.station.code}
            {rec.station.name ? ` · ${rec.station.name}` : ""} — ใช้เป็นหลักฐานตรวจสอบออเดอร์
          </p>
        </section>

        {/* Key metrics */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-muted">คะแนนความครบถ้วน</p>
              <ShieldCheck
                size={16}
                className={rec.completenessScore >= 80 ? "text-success" : "text-warning"}
              />
            </div>
            <p className="tabular mt-3 text-3xl leading-none font-semibold tracking-tight text-ink">
              {rec.completenessScore}%
            </p>
            <Progress
              className="mt-4"
              value={rec.completenessScore}
              tone={rec.completenessScore >= 80 ? "brand" : "warning"}
            />
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-muted">ไฟล์วิดีโอ</p>
              <Camera size={16} className="text-muted" />
            </div>
            <p className="tabular mt-3 text-3xl leading-none font-semibold tracking-tight text-ink">
              {filesWithSrc.length}
            </p>
            <p className="mt-4 text-xs text-muted">มุมกล้อง · รวม {formatBytes(totalBytes)}</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-muted">ลิงก์หมดอายุ</p>
              <Link2 size={16} className="text-muted" />
            </div>
            <p className="mt-3 text-lg font-semibold tracking-tight text-ink">
              {format(link.expiresAt, "d MMM yyyy HH:mm", { locale: th })}
            </p>
            <p className="mt-3 text-xs text-muted">
              เหลือ{" "}
              {formatDistanceStrict(link.expiresAt, new Date(), { locale: th, addSuffix: false })}
              {link.maxOpens != null
                ? ` · เปิดแล้ว ${link.openCount}/${link.maxOpens}`
                : ` · เปิดแล้ว ${link.openCount} ครั้ง`}
            </p>
          </Card>
        </section>

        {/* Videos */}
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-ink">วิดีโอหลักฐาน</h2>
            <p className="text-xs text-muted">{formatBytes(totalBytes)} รวมทุกมุมกล้อง</p>
          </div>

          {filesWithSrc.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="ยังไม่มีไฟล์วิดีโอ"
              description="ลิงก์นี้ยังไม่มีไฟล์ที่เผยแพร่ได้ กรุณาติดต่อผู้ส่งหลักฐาน"
            />
          ) : (
            <div className={filesWithSrc.length === 1 ? "grid gap-5" : "grid gap-5 sm:grid-cols-2"}>
              {filesWithSrc.map((file, index) => (
                <Card key={file.id} flush className="overflow-hidden">
                  <div className="relative aspect-video bg-black">
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
                      <div className="flex h-full flex-col items-center justify-center gap-1.5 px-4 text-center text-sm text-white/70">
                        <CircleSlash size={20} className="opacity-60" />
                        <span>ไม่สามารถเล่นไฟล์ได้</span>
                        <span className="text-xs text-white/50">{file.cameraLabel}</span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2">
                      <p className="truncate text-[10px] font-medium tracking-wide text-white/90 sm:text-xs">
                        {watermarkLabel}
                        {filesWithSrc.length > 1 ? ` · cam ${index + 1}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {file.cameraLabel || `กล้อง ${index + 1}`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatBytes(file.sizeBytes)}
                        {file.createdAt
                          ? ` · อัปโหลด ${format(file.createdAt, "d MMM HH:mm", { locale: th })}`
                          : ""}
                      </p>
                    </div>
                    <Badge>มุมที่ {index + 1}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Details */}
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">รายละเอียดการแพ็ค</h2>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem
              icon={CalendarClock}
              label="เริ่มอัด"
              value={format(rec.startedAt, "d MMM yyyy HH:mm:ss", { locale: th })}
            />
            <DetailItem
              icon={Clock}
              label="สิ้นสุด"
              value={rec.endedAt ? format(rec.endedAt, "d MMM yyyy HH:mm:ss", { locale: th }) : "—"}
            />
            <DetailItem icon={Timer} label="ระยะเวลา" value={formatDuration(durationSec)} />
            <DetailItem
              icon={MapPin}
              label="สถานี"
              value={[rec.station.code, rec.station.name, rec.station.location]
                .filter(Boolean)
                .join(" · ")}
            />
            <DetailItem icon={User} label="พนักงานแพ็ค" value={rec.employee.name} />
            <DetailItem
              icon={Package}
              label="ออเดอร์"
              value={[
                rec.order.orderNo,
                rec.order.trackingNo ? `Tracking ${rec.order.trackingNo}` : null,
                rec.order.source !== "manual" ? rec.order.source : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </dl>
        </section>

        {/* Timeline */}
        {rec.markers.length > 0 ? (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
              <ListTree size={18} className="text-muted" />
              ไทม์ไลน์เหตุการณ์
            </h2>
            <Card flush>
              <ol className="relative px-5 py-5">
                <span className="absolute top-7 bottom-7 left-[1.6rem] w-px bg-line" aria-hidden />
                {rec.markers.map((m) => {
                  const at = addSeconds(rec.startedAt, m.atSec);
                  return (
                    <li key={m.id} className="relative flex gap-4 py-2.5 pl-0">
                      <span className="relative z-10 mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-brand ring-4 ring-surface" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="text-sm font-medium text-ink">{m.label}</p>
                          <span className="tabular text-xs text-muted">+{m.atSec}s</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {format(at, "d MMM yyyy HH:mm:ss", { locale: th })}
                          {m.kind !== "scan" ? ` · ${m.kind}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </section>
        ) : null}

        {/* Snapshots */}
        {rec.snapshots.length > 0 ? (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
              <ImageIcon size={18} className="text-muted" />
              Snapshots
            </h2>
            <Card flush>
              <ul className="divide-y divide-line text-sm">
                {rec.snapshots.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5"
                  >
                    <span className="font-medium text-ink">Snapshot {i + 1}</span>
                    <time className="text-xs text-muted" dateTime={s.takenAt.toISOString()}>
                      {format(s.takenAt, "d MMM yyyy HH:mm:ss", { locale: th })}
                    </time>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}

        <footer className="border-t border-line pt-6 text-center text-xs leading-relaxed text-muted">
          <p>
            เอกสารหลักฐานจาก PackEX · สร้างลิงก์เมื่อ{" "}
            {format(link.createdAt, "d MMM yyyy HH:mm", { locale: th })}
          </p>
          <p className="mt-1">ข้อมูลนี้แชร์เพื่อตรวจสอบเคลมเท่านั้น — อย่าเผยแพร่ต่อหากไม่จำเป็น</p>
        </footer>
      </div>
    </ShareShell>
  );
}

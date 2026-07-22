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
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PackExWordmark } from "@/components/brand";
import { Badge, Card } from "@/components/ui";
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
    <div className="flex gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-2)] px-3.5 py-3 ring-1 ring-inset ring-[var(--border)]">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--accent)] ring-1 ring-[var(--border)]">
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          {label}
        </dt>
        <dd className="mt-0.5 truncate text-sm font-semibold text-[var(--ink)]">{value}</dd>
      </div>
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
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "unknown";

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
      <div className="warehouse-atmosphere relative min-h-screen">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-8">
          <div className="mb-8 flex justify-center">
            <PackExWordmark />
          </div>
          <ShareUnlockForm token={token} />
        </div>
      </div>
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

  return (
    <div className="warehouse-atmosphere relative min-h-screen">
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <PackExWordmark />
          <p className="text-xs text-[var(--muted)]">
            หลักฐานวิดีโอการแพ็ค · {link.tenant.name}
          </p>
        </header>

        {expired ? (
          <Card className="p-8 text-center sm:p-10">
            <Badge tone="danger" className="mb-4">
              หมดอายุ
            </Badge>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-rose-600 sm:text-2xl">
              ลิงก์หมดอายุแล้ว
            </h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              หมดอายุเมื่อ {format(link.expiresAt, "d MMMM yyyy เวลา HH:mm น.", { locale: th })}
            </p>
          </Card>
        ) : maxReached ? (
          <Card className="p-8 text-center sm:p-10">
            <Badge tone="danger" className="mb-4">
              จำกัดการเปิด
            </Badge>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-rose-600 sm:text-2xl">
              เปิดครบจำนวนที่กำหนดแล้ว
            </h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              เปิดแล้ว {link.openCount}
              {link.maxOpens != null ? ` / ${link.maxOpens}` : ""} ครั้ง
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            <section>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="info">ลิงก์แชร์หลักฐาน</Badge>
                <Badge tone={rec.status === "ready" ? "success" : "warning"}>
                  {statusLabel(rec.status)}
                </Badge>
                <Badge tone={rec.completenessScore >= 80 ? "success" : "warning"}>
                  ครบถ้วน {rec.completenessScore}%
                </Badge>
                {rec.legalHold ? <Badge tone="danger">Legal Hold</Badge> : null}
              </div>

              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                {rec.order.orderNo}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                บันทึกวิดีโอตอนแพ็คสินค้าจากสถานี {rec.station.code}
                {rec.station.name ? ` · ${rec.station.name}` : ""} — ใช้เป็นหลักฐานตรวจสอบออเดอร์
              </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem
                icon={CalendarClock}
                label="เริ่มอัด"
                value={format(rec.startedAt, "d MMM yyyy HH:mm:ss", { locale: th })}
              />
              <DetailItem
                icon={Clock}
                label="สิ้นสุด"
                value={
                  rec.endedAt
                    ? format(rec.endedAt, "d MMM yyyy HH:mm:ss", { locale: th })
                    : "—"
                }
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
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <Card className="flex items-center gap-3 p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    คะแนนครบถ้วน
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
                    {rec.completenessScore}%
                  </p>
                </div>
              </Card>
              <Card className="flex items-center gap-3 p-4">
                <Camera className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    ไฟล์วิดีโอ
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
                    {filesWithSrc.length} มุมกล้อง
                  </p>
                </div>
              </Card>
              <Card className="flex items-center gap-3 p-4">
                <Link2 className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    ลิงก์นี้หมดอายุ
                  </p>
                  <p className="text-sm font-semibold leading-snug text-[var(--ink)]">
                    {format(link.expiresAt, "d MMM yyyy HH:mm", { locale: th })}
                    <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">
                      เหลือ{" "}
                      {formatDistanceStrict(link.expiresAt, new Date(), {
                        locale: th,
                        addSuffix: false,
                      })}
                      {link.maxOpens != null
                        ? ` · เปิดแล้ว ${link.openCount}/${link.maxOpens}`
                        : ` · เปิดแล้ว ${link.openCount} ครั้ง`}
                    </span>
                  </p>
                </div>
              </Card>
            </section>

            <section>
              <div className="mb-3 flex items-end justify-between gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
                  วิดีโอหลักฐาน
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  รวม{" "}
                  {formatBytes(filesWithSrc.reduce((sum, f) => sum + f.sizeBytes, 0))}
                </p>
              </div>

              {filesWithSrc.length === 0 ? (
                <Card className="px-6 py-12 text-center text-sm text-[var(--muted)]">
                  ยังไม่มีไฟล์วิดีโอในลิงก์นี้
                </Card>
              ) : (
                <div
                  className={
                    filesWithSrc.length === 1
                      ? "grid gap-4"
                      : "grid gap-4 sm:grid-cols-2"
                  }
                >
                  {filesWithSrc.map((file, index) => (
                    <Card key={file.id} className="overflow-hidden p-0">
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
                          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center text-sm text-white/70">
                            <span>ไม่สามารถเล่นไฟล์ได้</span>
                            <span className="text-xs text-white/50">{file.cameraLabel}</span>
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8">
                          <p className="truncate text-[10px] font-medium tracking-wide text-white/90 sm:text-xs">
                            {watermarkLabel}
                            {filesWithSrc.length > 1 ? ` · cam ${index + 1}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">
                            {file.cameraLabel || `กล้อง ${index + 1}`}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {formatBytes(file.sizeBytes)}
                            {file.createdAt
                              ? ` · อัปโหลด ${format(file.createdAt, "d MMM HH:mm", { locale: th })}`
                              : ""}
                          </p>
                        </div>
                        <Badge tone="neutral">มุมที่ {index + 1}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {rec.markers.length > 0 ? (
              <section>
                <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
                  ไทม์ไลน์เหตุการณ์
                </h2>
                <Card className="overflow-hidden p-0">
                  <ul className="divide-y divide-[var(--border)]">
                    {rec.markers.map((m) => {
                      const at = addSeconds(rec.startedAt, m.atSec);
                      return (
                        <li
                          key={m.id}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
                        >
                          <div>
                            <p className="font-semibold text-[var(--ink)]">{m.label}</p>
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {format(at, "d MMM yyyy HH:mm:ss", { locale: th })}
                              <span className="mx-1.5 opacity-40">·</span>
                              วินาทีที่ {m.atSec}
                              {m.kind !== "scan" ? ` · ${m.kind}` : ""}
                            </p>
                          </div>
                          <Badge tone="neutral">+{m.atSec}s</Badge>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </section>
            ) : null}

            {rec.snapshots.length > 0 ? (
              <section>
                <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
                  Snapshots
                </h2>
                <Card className="p-0">
                  <ul className="divide-y divide-[var(--border)] text-sm">
                    {rec.snapshots.map((s, i) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
                      >
                        <span className="font-medium text-[var(--ink)]">Snapshot {i + 1}</span>
                        <time className="text-xs text-[var(--muted)]" dateTime={s.takenAt.toISOString()}>
                          {format(s.takenAt, "d MMM yyyy HH:mm:ss", { locale: th })}
                        </time>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            ) : null}

            <footer className="border-t border-[var(--border)] pt-6 text-center text-xs leading-relaxed text-[var(--muted)]">
              <p>
                เอกสารหลักฐานจาก PackEX · สร้างลิงก์เมื่อ{" "}
                {format(link.createdAt, "d MMM yyyy HH:mm", { locale: th })}
              </p>
              <p className="mt-1">
                ข้อมูลนี้แชร์เพื่อตรวจสอบเคลมเท่านั้น — อย่าเผยแพร่ต่อหากไม่จำเป็น
              </p>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

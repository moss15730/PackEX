"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Copy, Check, Trash2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type ShareInfo = {
  token: string;
  path: string;
  expiresAt: string;
  openCount: number;
  maxOpens: number | null;
};

export function VideoActions({
  tenantSlug,
  recordingId,
  recordingStatus,
  canDelete,
  canShare,
  initialShare,
}: {
  tenantSlug: string;
  recordingId: string;
  recordingStatus: string;
  canDelete: boolean;
  canShare: boolean;
  initialShare: ShareInfo | null;
}) {
  const router = useRouter();
  const { confirm, alert, toast } = useNotify();
  const [share, setShare] = useState<ShareInfo | null>(initialShare);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [maxOpens, setMaxOpens] = useState("");

  function fullShareUrl(token: string) {
    if (typeof window === "undefined") return `/share/${token}`;
    return `${window.location.origin}/share/${token}`;
  }

  async function handleDelete() {
    if (!canDelete) return;
    const isRecording = recordingStatus === "recording";
    const ok = await confirm({
      title: isRecording ? "กำลังอัดอยู่ — ยืนยันที่จะลบหรือไม่?" : "ลบวิดีโอนี้?",
      description: isRecording
        ? "วิดีโอนี้กำลังอัดอยู่ หากลบ การอัดจะถูกยกเลิก — ไฟล์จะถูกเก็บไว้ชั่วคราวเพื่อกู้คืนได้ตามนโยบาย"
        : "วิดีโอจะถูกซ่อนจากรายการ (soft delete) และกู้คืนได้ภายในช่วงที่ตั้งไว้ — ผู้รับลิงก์แชร์จะดูต่อไม่ได้",
      confirmLabel: "ลบวิดีโอ",
      cancelLabel: "ยกเลิก",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/videos/${recordingId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ลบไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          tone: "danger",
        });
        return;
      }
      toast({ title: "ลบวิดีโอแล้ว", tone: "success" });
      router.push(`/t/${tenantSlug}/videos`);
      router.refresh();
    } catch {
      await alert({
        title: "ลบไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateShare() {
    if (!canShare) return;
    setBusy(true);
    setCopied(false);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/videos/${recordingId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresInDays: 30,
          password: sharePassword.trim() || null,
          maxOpens: maxOpens.trim() ? Number(maxOpens) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "สร้างลิงก์ไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          tone: "danger",
        });
        return;
      }
      setShare({
        token: data.token,
        path: data.path,
        expiresAt: data.expiresAt,
        openCount: 0,
        maxOpens: data.maxOpens ?? null,
      });
      setSharePassword("");
      toast({
        title: "สร้างลิงก์แชร์แล้ว",
        description: data.passwordProtected
          ? "ลิงก์มีรหัสผ่าน — ส่งรหัสแยกจากลิงก์"
          : "คัดลอกลิงก์เพื่อส่งให้ผู้อื่นดูได้โดยไม่ต้องล็อกอิน",
        tone: "success",
      });
      router.refresh();
    } catch {
      await alert({
        title: "สร้างลิงก์ไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(fullShareUrl(share.token));
      setCopied(true);
      toast({ title: "คัดลอกลิงก์แล้ว", tone: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await alert({
        title: "คัดลอกไม่สำเร็จ",
        description: "เบราว์เซอร์ไม่อนุญาตการคัดลอก — คัดลอกจากช่องลิงก์ด้วยตนเอง",
        tone: "warning",
      });
    }
  }

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-ink">
            <Link2 size={15} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-ink">แชร์ลิงก์หลักฐาน</h3>
            <p className="text-[11px] text-muted">ผู้รับดูได้โดยไม่ต้องล็อกอิน</p>
          </div>
        </div>

        <div className="mt-3.5">
          {!canShare ? (
            <p className="text-xs text-muted">บัญชีนี้ไม่มีสิทธิ์แชร์ลิงก์</p>
          ) : share ? (
            <div className="space-y-3">
              <code className="block rounded-lg border border-line bg-subtle px-2.5 py-2 text-[11px] leading-relaxed break-all text-ink-2">
                {fullShareUrl(share.token)}
              </code>
              <dl className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                <div className="flex gap-1">
                  <dt>หมดอายุ</dt>
                  <dd className="text-ink-2">
                    {format(new Date(share.expiresAt), "d MMM yyyy", { locale: th })}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt>เปิดแล้ว</dt>
                  <dd className="tabular text-ink-2">
                    {share.openCount}
                    {share.maxOpens != null ? `/${share.maxOpens}` : ""} ครั้ง
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={copyLink}
                  disabled={busy}
                  icon={copied ? Check : Copy}
                >
                  {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleCreateShare}
                  loading={busy}
                  icon={RefreshCw}
                >
                  สร้างใหม่
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-muted">
                สร้างลิงก์สาธารณะแบบมีวันหมดอายุ เพื่อส่งให้ลูกค้าหรือขนส่งตรวจสอบหลักฐาน
              </p>
              <Field label="รหัสผ่าน (ไม่บังคับ)">
                <Input
                  type="password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="เว้นว่าง = ไม่ใส่รหัส"
                  className="py-1.5 text-xs"
                />
              </Field>
              <Field label="จำกัดจำนวนครั้งที่เปิด">
                <Input
                  type="number"
                  min={1}
                  value={maxOpens}
                  onChange={(e) => setMaxOpens(e.target.value)}
                  placeholder="เว้นว่าง = ไม่จำกัด"
                  className="py-1.5 text-xs"
                />
              </Field>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateShare}
                loading={busy}
                icon={Link2}
                className="w-full"
              >
                สร้างลิงก์แชร์
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-line px-4 py-3">
        {canDelete ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">ลบวิดีโอ</p>
              <p className="text-[11px] text-muted">กู้คืนได้ภายในระยะเวลาที่ตั้งไว้</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={busy}
              icon={Trash2}
              className="shrink-0 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
            >
              ลบ
            </Button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-[11px] text-muted">
            <ShieldAlert size={13} />
            บัญชีนี้ไม่มีสิทธิ์ลบวิดีโอ
          </p>
        )}
      </section>
    </div>
  );
}

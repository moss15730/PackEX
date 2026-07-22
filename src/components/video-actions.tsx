"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Copy, Check, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
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
      <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)]/15 text-[var(--accent-ink)] dark:text-[var(--accent)]">
            <Link2 className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="text-xs font-semibold text-[var(--ink)]">แชร์ลิงก์</h2>
            <p className="text-[11px] text-[var(--muted)]">ดูได้โดยไม่ต้องล็อกอิน</p>
          </div>
        </div>

        {canShare ? (
          share ? (
            <div className="space-y-2">
              <code className="block break-all rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-[11px] leading-relaxed text-[var(--ink)]">
                {fullShareUrl(share.token)}
              </code>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[var(--muted)]">
                <span>
                  หมดอายุ {format(new Date(share.expiresAt), "d MMM yyyy", { locale: th })}
                </span>
                <span aria-hidden>·</span>
                <span>
                  เปิดแล้ว {share.openCount}
                  {share.maxOpens != null ? ` / ${share.maxOpens}` : ""} ครั้ง
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" onClick={copyLink} disabled={busy} className="px-2.5 py-1.5 text-xs">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateShare}
                  disabled={busy}
                  className="px-2.5 py-1.5 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  สร้างใหม่
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                สร้างลิงก์สาธารณะให้คนอื่นดูวิดีโอได้โดยไม่ต้องล็อกอิน
              </p>
              <input
                type="password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                placeholder="รหัสผ่าน (ว่าง = ไม่ใส่)"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              />
              <input
                type="number"
                min={1}
                value={maxOpens}
                onChange={(e) => setMaxOpens(e.target.value)}
                placeholder="จำกัดครั้งเปิด (ว่าง = ไม่จำกัด)"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              />
              <Button
                type="button"
                onClick={handleCreateShare}
                disabled={busy}
                className="w-full px-2.5 py-1.5 text-xs"
              >
                <Link2 className="h-3 w-3" />
                สร้างลิงก์แชร์
              </Button>
            </div>
          )
        ) : (
          <p className="text-xs text-[var(--muted)]">บัญชีนี้ไม่มีสิทธิ์แชร์ลิงก์</p>
        )}
      </section>

      <section className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2">
        {canDelete ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted)]">ลบวิดีโอ (soft delete)</p>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={busy}
              className="shrink-0 px-2 py-1 text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-500"
            >
              <Trash2 className="h-3 w-3" />
              ลบ
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-[var(--muted)]">บัญชีนี้ไม่มีสิทธิ์ลบวิดีโอ</p>
        )}
      </section>
    </div>
  );
}

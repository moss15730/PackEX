"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
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
        ? "วิดีโอนี้กำลังอัดอยู่ หากลบ การอัดจะถูกยกเลิก และผู้รับลิงก์แชร์จะดูไม่ได้"
        : "วิดีโอจะถูกนำออกจากรายการ และผู้รับลิงก์แชร์จะดูต่อไม่ได้",
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
        body: JSON.stringify({ expiresInDays: 30 }),
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
      toast({
        title: "สร้างลิงก์แชร์แล้ว",
        description: "คัดลอกลิงก์เพื่อส่งให้ผู้อื่นดูได้โดยไม่ต้องล็อกอิน",
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
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 font-semibold text-[var(--ink)]">แชร์ลิงก์ (ดูได้โดยไม่ต้องล็อกอิน)</h2>
        {canShare ? (
          <div className="space-y-3 text-sm">
            {share ? (
              <>
                <p className="text-[var(--muted)]">
                  หมดอายุ {format(new Date(share.expiresAt), "d MMM yyyy", { locale: th })}
                </p>
                <code className="block break-all rounded bg-[var(--surface-2)] px-2 py-2 text-xs">
                  {fullShareUrl(share.token)}
                </code>
                <p className="text-xs text-[var(--muted)]">
                  เปิดแล้ว {share.openCount}
                  {share.maxOpens != null ? ` / ${share.maxOpens}` : ""} ครั้ง
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={copyLink} disabled={busy}>
                    {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateShare}
                    disabled={busy}
                  >
                    สร้างลิงก์ใหม่
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[var(--muted)]">
                  สร้างลิงก์สาธารณะให้คนอื่นดูวิดีโอและรายละเอียดได้ โดยไม่ต้องเข้าสู่ระบบ PackEX
                </p>
                <Button type="button" onClick={handleCreateShare} disabled={busy}>
                  สร้างลิงก์แชร์
                </Button>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">บัญชีนี้ไม่มีสิทธิ์แชร์ลิงก์</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-[var(--ink)]">ลบวิดีโอ</h2>
        {canDelete ? (
          <div className="space-y-3 text-sm">
            <p className="text-[var(--muted)]">
              ลบออกจากรายการวิดีโอ (soft delete) — กู้คืนได้เฉพาะจากฐานข้อมูล
            </p>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={busy}>
              ลบวิดีโอ
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">บัญชีนี้ไม่มีสิทธิ์ลบวิดีโอ</p>
        )}
      </Card>
    </div>
  );
}

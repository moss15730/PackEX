"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { useNotify } from "@/components/notify";

export function HashVerifyButton({
  tenantSlug,
  recordingId,
}: {
  tenantSlug: string;
  recordingId: string;
}) {
  const { toast, alert } = useNotify();
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/videos/${recordingId}/verify`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ตรวจ hash ไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      if (data.allMatch) {
        toast({
          title: "Hash ตรงทั้งหมด",
          description: `ตรวจแล้ว ${data.results?.length ?? 0} ไฟล์ — ไฟล์ไม่ถูกแก้`,
          tone: "success",
        });
      } else {
        const failed = (data.results || []).filter((r: { match: boolean }) => !r.match);
        await alert({
          title: "พบไฟล์ที่ hash ไม่ตรง",
          description: `${failed.length} ไฟล์ไม่ตรงกับค่าในฐานข้อมูล — ควรตรวจสอบหลักฐานนี้`,
          tone: "danger",
        });
      }
    } catch {
      await alert({
        title: "ตรวจ hash ไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="w-full"
      loading={busy}
      icon={ShieldCheck}
      onClick={() => void verify()}
    >
      {busy ? "กำลังตรวจ…" : "ตรวจสอบ SHA-256"}
    </Button>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, TableScroll } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export type DeletedVideoItem = {
  id: string;
  orderNo: string;
  stationCode: string;
  deletedAt: string;
  employeeName: string;
  completenessScore: number;
  restoreUntil: string;
  expired: boolean;
};

export function DeletedVideosList({
  tenantSlug,
  items,
  softDeleteDays,
}: {
  tenantSlug: string;
  items: DeletedVideoItem[];
  softDeleteDays: number;
}) {
  const router = useRouter();
  const { alert, toast } = useNotify();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function restore(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/videos/${id}/restore`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "กู้คืนไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      toast({ title: "กู้คืนวิดีโอแล้ว", tone: "success" });
      router.refresh();
    } catch {
      await alert({
        title: "กู้คืนไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด",
        tone: "danger",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--muted)]">
        วิดีโอที่ลบแล้วจะกู้คืนได้ภายใน {softDeleteDays} วัน — ไฟล์ยังอยู่ใน Storage
      </p>

      <div className="mb-4">
        <Link
          href={`/t/${tenantSlug}/videos`}
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          ← กลับรายการวิดีโอ
        </Link>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((rec) => (
          <div
            key={rec.id}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
          >
            <p className="font-medium text-[var(--ink)]">{rec.orderNo}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {rec.stationCode} · ลบ{" "}
              {format(new Date(rec.deletedAt), "d MMM HH:mm", { locale: th })}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={rec.expired ? "danger" : "warning"}>
                {rec.expired
                  ? "หมดเวลากู้คืน"
                  : `กู้ได้ถึง ${format(new Date(rec.restoreUntil), "d MMM", { locale: th })}`}
              </Badge>
              {!rec.expired && (
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  disabled={busyId === rec.id}
                  onClick={() => void restore(rec.id)}
                >
                  {busyId === rec.id ? "กำลังกู้…" : "กู้คืน"}
                </Button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-8 text-center text-[var(--muted)]">ไม่มีวิดีโอในถังลบ</p>
        )}
      </div>

      <div className="hidden md:block">
        <TableScroll>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">ออเดอร์</th>
                <th className="px-3 py-2 font-medium">สถานี</th>
                <th className="px-3 py-2 font-medium">ลบเมื่อ</th>
                <th className="px-3 py-2 font-medium">กู้คืนได้ถึง</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((rec) => (
                <tr key={rec.id} className="border-b border-[var(--border)]/70">
                  <td className="px-3 py-2.5 font-medium text-[var(--ink)]">{rec.orderNo}</td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">{rec.stationCode}</td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">
                    {format(new Date(rec.deletedAt), "d MMM yyyy HH:mm", { locale: th })}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={rec.expired ? "danger" : "warning"}>
                      {rec.expired
                        ? "หมดเวลา"
                        : format(new Date(rec.restoreUntil), "d MMM yyyy", { locale: th })}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {!rec.expired && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs"
                        disabled={busyId === rec.id}
                        onClick={() => void restore(rec.id)}
                      >
                        {busyId === rec.id ? "กำลังกู้…" : "กู้คืน"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        {items.length === 0 && (
          <p className="py-8 text-center text-[var(--muted)]">ไม่มีวิดีโอในถังลบ</p>
        )}
      </div>
    </div>
  );
}

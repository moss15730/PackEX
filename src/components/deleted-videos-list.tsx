"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  Table,
  TableCard,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
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

  const empty = (
    <EmptyState
      icon={Trash2}
      title="ถังลบว่างเปล่า"
      description="ยังไม่มีวิดีโอที่ถูกลบ — เมื่อลบวิดีโอ ระบบจะเก็บไว้ที่นี่ชั่วคราวก่อนลบถาวร"
    />
  );

  return (
    <div className="space-y-5">
      <Callout tone="info" icon={Trash2}>
        วิดีโอที่ลบแล้วจะกู้คืนได้ภายใน {softDeleteDays} วัน — ไฟล์ยังคงอยู่ใน storage
        จนกว่าจะพ้นกำหนด
      </Callout>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {items.length === 0
          ? empty
          : items.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-line bg-surface p-4 shadow-sm"
              >
                <p className="font-medium text-ink">{rec.orderNo}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {rec.stationCode} · ลบ{" "}
                  {format(new Date(rec.deletedAt), "d MMM HH:mm", { locale: th })}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={rec.expired ? "danger" : "warning"} dot>
                    {rec.expired
                      ? "หมดเวลากู้คืน"
                      : `กู้ได้ถึง ${format(new Date(rec.restoreUntil), "d MMM", { locale: th })}`}
                  </Badge>
                  {!rec.expired && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={RotateCcw}
                      loading={busyId === rec.id}
                      onClick={() => void restore(rec.id)}
                    >
                      กู้คืน
                    </Button>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        {items.length === 0 ? (
          empty
        ) : (
          <TableCard>
            <Table>
              <THead>
                <Th>ออเดอร์</Th>
                <Th>สถานี</Th>
                <Th>พนักงาน</Th>
                <Th>ลบเมื่อ</Th>
                <Th>กู้คืนได้ถึง</Th>
                <Th align="right">การจัดการ</Th>
              </THead>
              <TBody>
                {items.map((rec) => (
                  <Tr key={rec.id}>
                    <Td className="font-medium text-ink">{rec.orderNo}</Td>
                    <Td>{rec.stationCode}</Td>
                    <Td>{rec.employeeName}</Td>
                    <Td className="text-muted">
                      {format(new Date(rec.deletedAt), "d MMM yyyy HH:mm", { locale: th })}
                    </Td>
                    <Td>
                      <Badge tone={rec.expired ? "danger" : "warning"} dot>
                        {rec.expired
                          ? "หมดเวลา"
                          : format(new Date(rec.restoreUntil), "d MMM yyyy", { locale: th })}
                      </Badge>
                    </Td>
                    <Td align="right">
                      {!rec.expired ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={RotateCcw}
                          loading={busyId === rec.id}
                          onClick={() => void restore(rec.id)}
                        >
                          กู้คืน
                        </Button>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableCard>
        )}
      </div>
    </div>
  );
}

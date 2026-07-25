"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Database, Download, Play, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Table,
  TableCard,
  TBody,
  Td,
  Th,
  THead,
  Toolbar,
  Tr,
} from "@/components/ui";
import { useNotify } from "@/components/notify";
import { dataRequestStatusLabel, dataRequestTypeLabel } from "@/lib/data-requests";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export type DataRequestRow = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  type: string;
  status: string;
  createdAt: string;
};

const statusTone = (status: string) =>
  status === "completed"
    ? ("success" as const)
    : status === "rejected"
      ? ("neutral" as const)
      : status === "processing"
        ? ("info" as const)
        : ("warning" as const);

export function PlatformDataRequestsManager({
  requests,
  canManage,
}: {
  requests: DataRequestRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { confirm, alert, toast } = useNotify();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(row: DataRequestRow, status: string) {
    if (status === "rejected") {
      const ok = await confirm({
        title: "ปฏิเสธคำขอนี้?",
        description: `คำขอ${dataRequestTypeLabel(row.type)}ของ ${row.tenantName} จะถูกปิดโดยไม่ดำเนินการ`,
        confirmLabel: "ปฏิเสธคำขอ",
        tone: "danger",
      });
      if (!ok) return;
    }

    setBusyId(row.id);
    try {
      const res = await fetch(`/api/platform/data-requests/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "อัปเดตไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      toast({ title: `อัปเดตเป็น “${dataRequestStatusLabel(status)}” แล้ว`, tone: "success" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="ไม่มีคำขอข้อมูล"
        description="เมื่อองค์กรยื่นคำขอส่งออกหรือลบข้อมูลตาม PDPA รายการจะปรากฏที่นี่"
      />
    );
  }

  return (
    <TableCard
      minWidthClassName="min-w-[820px]"
      header={
        <Toolbar actions={<span className="text-xs text-muted">{requests.length} รายการ</span>}>
          <span className="text-[13px] font-medium text-ink">คำขอทั้งหมด</span>
        </Toolbar>
      }
    >
      <Table>
        <THead>
          <Th>องค์กร</Th>
          <Th>ประเภท</Th>
          <Th>สถานะ</Th>
          <Th align="right">วันที่ยื่น</Th>
          <Th align="right">ดำเนินการ</Th>
        </THead>
        <TBody>
          {requests.map((row) => {
            const closed = row.status === "completed" || row.status === "rejected";
            return (
              <Tr key={row.id}>
                <Td>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{row.tenantName}</p>
                    <p className="font-mono text-xs text-muted">{row.tenantSlug}</p>
                  </div>
                </Td>
                <Td>
                  <Badge
                    tone={row.type === "export" ? "info" : "danger"}
                    icon={row.type === "export" ? Download : Trash2}
                  >
                    {dataRequestTypeLabel(row.type)}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={statusTone(row.status)} dot>
                    {dataRequestStatusLabel(row.status)}
                  </Badge>
                </Td>
                <Td align="right" className="text-muted">
                  {format(new Date(row.createdAt), "d MMM yyyy HH:mm", { locale: th })}
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-1">
                    {row.type === "export" ? (
                      <a
                        href={`/api/platform/data-requests/${row.id}/export`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-ink-2 transition hover:bg-subtle hover:text-ink"
                      >
                        <Download size={15} />
                        ดาวน์โหลด
                      </a>
                    ) : null}

                    {canManage && !closed ? (
                      <>
                        {row.status === "pending" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={Play}
                            loading={busyId === row.id}
                            onClick={() => void setStatus(row, "processing")}
                          >
                            เริ่มดำเนินการ
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={Check}
                          loading={busyId === row.id}
                          onClick={() => void setStatus(row, "completed")}
                        >
                          เสร็จสิ้น
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={X}
                          className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                          loading={busyId === row.id}
                          onClick={() => void setStatus(row, "rejected")}
                        >
                          ปฏิเสธ
                        </Button>
                      </>
                    ) : null}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </TableCard>
  );
}

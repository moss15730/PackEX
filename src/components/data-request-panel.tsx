"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ShieldQuestion, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { dataRequestStatusLabel, dataRequestTypeLabel } from "@/lib/data-requests";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export type TenantDataRequest = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
};

export function DataRequestPanel({
  tenantSlug,
  requests,
}: {
  tenantSlug: string;
  requests: TenantDataRequest[];
}) {
  const router = useRouter();
  const { confirm, alert, toast } = useNotify();
  const [busy, setBusy] = useState<string | null>(null);

  const openRequest = (type: string) =>
    requests.find((r) => r.type === type && (r.status === "pending" || r.status === "processing"));

  async function submit(type: "export" | "deletion") {
    const isDeletion = type === "deletion";
    const ok = await confirm({
      title: isDeletion ? "ยื่นคำขอลบข้อมูลทั้งหมด?" : "ยื่นคำขอส่งออกข้อมูล?",
      description: isDeletion
        ? "ทีมงานจะติดต่อยืนยันตัวตนก่อนดำเนินการ การลบข้อมูลย้อนกลับไม่ได้ และวิดีโอที่ติด legal hold จะถูกยกเว้น"
        : "ทีมงานจะรวบรวมข้อมูลองค์กร ผู้ใช้ วิดีโอ และ audit log ให้ตามสิทธิ์ PDPA",
      confirmLabel: isDeletion ? "ยื่นคำขอลบข้อมูล" : "ยื่นคำขอส่งออก",
      tone: isDeletion ? "danger" : "info",
    });
    if (!ok) return;

    setBusy(type);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/data-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ยื่นคำขอไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          tone: "danger",
        });
        return;
      }
      toast({
        title: "ยื่นคำขอแล้ว",
        description: "ทีมงานจะดำเนินการและติดต่อกลับ",
        tone: "success",
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card flush>
      <CardHeader
        icon={ShieldQuestion}
        title="สิทธิ์เจ้าของข้อมูล (PDPA)"
        description="ขอสำเนาข้อมูลหรือขอลบข้อมูลขององค์กรตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล"
      />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-medium text-ink">ขอสำเนาข้อมูล</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              ได้ไฟล์รวมข้อมูลองค์กร ผู้ใช้ วิดีโอ (รายการอ้างอิง) เคลม และ audit log
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Download}
              className="mt-3"
              loading={busy === "export"}
              disabled={Boolean(openRequest("export"))}
              onClick={() => void submit("export")}
            >
              {openRequest("export") ? "ยื่นคำขอแล้ว" : "ยื่นคำขอส่งออก"}
            </Button>
          </div>

          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-medium text-ink">ขอลบข้อมูล</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              ทีมงานจะยืนยันตัวตนก่อนลบ — วิดีโอที่ติด legal hold จะไม่ถูกลบ
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={Trash2}
              className="mt-3 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
              loading={busy === "deletion"}
              disabled={Boolean(openRequest("deletion"))}
              onClick={() => void submit("deletion")}
            >
              {openRequest("deletion") ? "ยื่นคำขอแล้ว" : "ยื่นคำขอลบข้อมูล"}
            </Button>
          </div>
        </div>

        {requests.length > 0 ? (
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink">ประวัติคำขอ</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-[13px] text-ink-2">{dataRequestTypeLabel(r.type)}</span>
                  <span className="flex items-center gap-3">
                    <Badge
                      tone={
                        r.status === "completed"
                          ? "success"
                          : r.status === "rejected"
                            ? "neutral"
                            : r.status === "processing"
                              ? "info"
                              : "warning"
                      }
                      dot
                    >
                      {dataRequestStatusLabel(r.status)}
                    </Badge>
                    <time className="shrink-0 text-xs text-faint">
                      {format(new Date(r.createdAt), "d MMM yyyy", { locale: th })}
                    </time>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

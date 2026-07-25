"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Plus, ReceiptText } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Select,
  Table,
  TableCard,
  TBody,
  Td,
  Th,
  THead,
  Toolbar,
  Tr,
} from "@/components/ui";
import { Modal } from "@/components/ui-client";
import { useNotify } from "@/components/notify";
import { invoiceStatusLabel, invoiceStatusTone } from "@/lib/billing";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export type InvoiceRow = {
  id: string;
  tenantSlug: string;
  tenantName: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  issuedAt: string;
};

export type InvoiceTenantOption = { id: string; slug: string; name: string };

export function PlatformInvoicesManager({
  invoices,
  tenants,
  canManage,
}: {
  invoices: InvoiceRow[];
  tenants: InvoiceTenantOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { alert, toast, confirm } = useNotify();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");

  async function setInvoiceStatus(row: InvoiceRow, next: string) {
    if (next === "void") {
      const ok = await confirm({
        title: "ยกเลิกใบแจ้งหนี้นี้?",
        description: `${row.description} · ${row.amount.toLocaleString()} ${row.currency}`,
        confirmLabel: "ยกเลิกใบแจ้งหนี้",
        tone: "danger",
      });
      if (!ok) return;
    }

    setBusyId(row.id);
    try {
      const res = await fetch(`/api/platform/invoices/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
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
      toast({ title: `อัปเดตเป็น “${invoiceStatusLabel(next)}” แล้ว`, tone: "success" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/platform/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, amount: Number(amount), description, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ออกใบแจ้งหนี้ไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      toast({ title: "ออกใบแจ้งหนี้แล้ว", tone: "success" });
      setShowCreate(false);
      setAmount("");
      setDescription("");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      {canManage ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            ใบแจ้งหนี้รายเดือนออกอัตโนมัติจาก cron — ที่นี่ใช้ออกรายการเพิ่มเติมและยืนยันการชำระ
          </p>
          <Button
            type="button"
            icon={Plus}
            onClick={() => setShowCreate(true)}
            disabled={tenants.length === 0}
          >
            ออกใบแจ้งหนี้
          </Button>
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="ยังไม่มีใบแจ้งหนี้"
          description="เมื่อ cron รอบเดือนทำงาน หรือออกใบแจ้งหนี้เอง รายการจะแสดงที่นี่"
          action={
            canManage && tenants.length > 0 ? (
              <Button type="button" icon={Plus} onClick={() => setShowCreate(true)}>
                ออกใบแจ้งหนี้
              </Button>
            ) : null
          }
        />
      ) : (
        <TableCard
          minWidthClassName="min-w-[880px]"
          header={
            <Toolbar
              actions={<span className="text-xs text-muted">{invoices.length} รายการล่าสุด</span>}
            >
              <span className="text-[13px] font-medium text-ink">ใบแจ้งหนี้ทั้งหมด</span>
            </Toolbar>
          }
        >
          <Table>
            <THead>
              <Th>องค์กร</Th>
              <Th>รายการ</Th>
              <Th align="right">จำนวน</Th>
              <Th>สถานะ</Th>
              <Th align="right">วันที่ออก</Th>
              <Th align="right">จัดการ</Th>
            </THead>
            <TBody>
              {invoices.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{row.tenantName}</p>
                      <p className="font-mono text-xs text-muted">{row.tenantSlug}</p>
                    </div>
                  </Td>
                  <Td className="max-w-[20rem] truncate">{row.description}</Td>
                  <Td align="right" className="tabular font-medium text-ink">
                    {row.amount.toLocaleString()} {row.currency}
                  </Td>
                  <Td>
                    <Badge tone={invoiceStatusTone(row.status)} dot>
                      {invoiceStatusLabel(row.status)}
                    </Badge>
                  </Td>
                  <Td align="right" className="text-muted">
                    {format(new Date(row.issuedAt), "d MMM yyyy", { locale: th })}
                  </Td>
                  <Td align="right">
                    {canManage && row.status !== "paid" && row.status !== "void" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={Check}
                          loading={busyId === row.id}
                          onClick={() => void setInvoiceStatus(row, "paid")}
                        >
                          ชำระแล้ว
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={Ban}
                          className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                          loading={busyId === row.id}
                          onClick={() => void setInvoiceStatus(row, "void")}
                        >
                          ยกเลิก
                        </Button>
                      </div>
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

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="ออกใบแจ้งหนี้"
        description="ใช้สำหรับค่าติดตั้ง ค่าใช้งานเกินแพ็กเกจ หรือการปรับยอด"
        icon={ReceiptText}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              ยกเลิก
            </Button>
            <Button type="submit" form="invoice-create" loading={creating}>
              ออกใบแจ้งหนี้
            </Button>
          </>
        }
      >
        <form id="invoice-create" onSubmit={createInvoice} className="space-y-4">
          <Field label="องค์กร" required>
            <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} required>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="รายละเอียด" required>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ค่าติดตั้งระบบ"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="จำนวนเงิน (THB)" required>
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
            <Field label="สถานะเริ่มต้น">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">รอชำระ</option>
                <option value="draft">ร่าง</option>
                <option value="paid">ชำระแล้ว</option>
              </Select>
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { useNotify } from "@/components/notify";

export type ClaimReasonItem = {
  id: string;
  label: string;
  active: boolean;
  sortOrder: number;
  caseCount: number;
};

export function ClaimReasonsManager({
  tenantSlug,
  canManage,
  reasons: initialReasons,
}: {
  tenantSlug: string;
  canManage: boolean;
  reasons: ClaimReasonItem[];
}) {
  const router = useRouter();
  const { confirm, alert, toast } = useNotify();
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  function openCreate() {
    setEditingId(null);
    setLabel("");
    setShowCreate(true);
  }

  function openEdit(item: ClaimReasonItem) {
    setShowCreate(false);
    setEditingId(item.id);
    setLabel(item.label);
  }

  function closeForm() {
    setShowCreate(false);
    setEditingId(null);
    setLabel("");
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/claim-reasons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "เพิ่มเหตุผลไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      toast({ title: "เพิ่มเหตุผลเคลมแล้ว", tone: "success" });
      closeForm();
      router.refresh();
    } catch {
      await alert({
        title: "เพิ่มเหตุผลไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/claim-reasons/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "แก้ไขไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      toast({ title: "บันทึกเหตุผลเคลมแล้ว", tone: "success" });
      closeForm();
      router.refresh();
    } catch {
      await alert({
        title: "แก้ไขไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: ClaimReasonItem) {
    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/claim-reasons/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
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
      toast({
        title: item.active ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว",
        description: item.label,
        tone: "success",
      });
      router.refresh();
    } catch {
      await alert({
        title: "อัปเดตไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: ClaimReasonItem) {
    const ok = await confirm({
      title: `ลบเหตุผล «${item.label}»?`,
      description:
        item.caseCount > 0
          ? `มีเคสใช้เหตุผลนี้อยู่ ${item.caseCount} รายการ — ระบบจะปิดการใช้งานแทนการลบ`
          : "ลบออกจากรายการดรอปดาวน์",
      confirmLabel: item.caseCount > 0 ? "ปิดใช้งาน" : "ลบ",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/claim-reasons/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ลบไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      if (editingId === item.id) closeForm();
      toast({
        title: data.deactivated ? "ปิดใช้งานแล้ว" : "ลบเหตุผลแล้ว",
        description: data.message || item.label,
        tone: "success",
      });
      router.refresh();
    } catch {
      await alert({
        title: "ลบไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          ใช้เป็นตัวเลือกดรอปดาวน์ตอนสร้างเคสเคลม
        </p>
        {canManage && (
          <Button type="button" onClick={openCreate} disabled={busy || showCreate}>
            เพิ่มเหตุผล
          </Button>
        )}
      </div>

      {showCreate && canManage && (
        <Card>
          <form onSubmit={submitCreate} className="flex flex-wrap gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="เช่น สินค้าหายจากกล่อง"
              required
              className="min-w-[220px] flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
            />
            <Button type="submit" disabled={busy}>
              บันทึก
            </Button>
            <Button type="button" variant="outline" onClick={closeForm} disabled={busy}>
              ยกเลิก
            </Button>
          </form>
        </Card>
      )}

      {editingId && canManage && (
        <Card>
          <form onSubmit={submitEdit} className="flex flex-wrap gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              className="min-w-[220px] flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
            />
            <Button type="submit" disabled={busy}>
              บันทึกการแก้ไข
            </Button>
            <Button type="button" variant="outline" onClick={closeForm} disabled={busy}>
              ยกเลิก
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <ul className="divide-y divide-[var(--border)]">
          {initialReasons.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[var(--ink)]">{item.label}</span>
                <Badge tone={item.active ? "success" : "neutral"}>
                  {item.active ? "ใช้งาน" : "ปิดใช้"}
                </Badge>
                {item.caseCount > 0 && (
                  <span className="text-xs text-[var(--muted)]">ใช้ใน {item.caseCount} เคส</span>
                )}
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => openEdit(item)}
                    disabled={busy}
                  >
                    แก้ไข
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs"
                    onClick={() => void toggleActive(item)}
                    disabled={busy}
                  >
                    {item.active ? "ปิดใช้" : "เปิดใช้"}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="text-xs"
                    onClick={() => void handleDelete(item)}
                    disabled={busy}
                  >
                    ลบ
                  </Button>
                </div>
              )}
            </li>
          ))}
          {initialReasons.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              ยังไม่มีเหตุผลเคลม
              {canManage ? " — กด «เพิ่มเหตุผล» เพื่อเริ่มต้น" : ""}
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}

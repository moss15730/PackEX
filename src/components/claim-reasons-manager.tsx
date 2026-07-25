"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input } from "@/components/ui";
import { Modal } from "@/components/ui-client";
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

  const labelField = (
    <Field label="ชื่อเหตุผล" required>
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="เช่น สินค้าหายจากกล่อง"
        required
        autoFocus
      />
    </Field>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          รายการนี้จะแสดงเป็นตัวเลือกดรอปดาวน์ตอนสร้างเคสเคลม
        </p>
        {canManage && (
          <Button type="button" onClick={openCreate} disabled={busy} icon={Plus}>
            เพิ่มเหตุผล
          </Button>
        )}
      </div>

      {initialReasons.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="ยังไม่มีเหตุผลเคลม"
          description="สร้างรายการเหตุผล เพื่อให้ทีมเลือกได้อย่างสม่ำเสมอเมื่อเปิดเคส"
          action={
            canManage ? (
              <Button type="button" onClick={openCreate} icon={Plus}>
                เพิ่มเหตุผล
              </Button>
            ) : null
          }
        />
      ) : (
        <Card flush>
          <ul className="divide-y divide-line">
            {initialReasons.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <span className="text-sm font-medium text-ink">{item.label}</span>
                  <Badge tone={item.active ? "success" : "neutral"} dot>
                    {item.active ? "ใช้งาน" : "ปิดใช้"}
                  </Badge>
                  {item.caseCount > 0 && (
                    <span className="text-xs text-muted">ใช้ใน {item.caseCount} เคส</span>
                  )}
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Pencil}
                      onClick={() => openEdit(item)}
                      disabled={busy}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={item.active ? EyeOff : Eye}
                      onClick={() => void toggleActive(item)}
                      disabled={busy}
                    >
                      {item.active ? "ปิดใช้" : "เปิดใช้"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                      onClick={() => void handleDelete(item)}
                      disabled={busy}
                    >
                      ลบ
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={showCreate && canManage}
        onClose={closeForm}
        title="เพิ่มเหตุผลเคลม"
        description="ตัวเลือกใหม่จะปรากฏในดรอปดาวน์ตอนสร้างเคส"
        icon={Plus}
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeForm} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" form="reason-create" loading={busy}>
              บันทึก
            </Button>
          </>
        }
      >
        <form id="reason-create" onSubmit={submitCreate}>
          {labelField}
        </form>
      </Modal>

      <Modal
        open={Boolean(editingId) && canManage}
        onClose={closeForm}
        title="แก้ไขเหตุผลเคลม"
        icon={Pencil}
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeForm} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" form="reason-edit" loading={busy}>
              บันทึกการแก้ไข
            </Button>
          </>
        }
      >
        <form id="reason-edit" onSubmit={submitEdit}>
          {labelField}
        </form>
      </Modal>
    </div>
  );
}

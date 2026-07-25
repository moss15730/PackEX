"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Film,
  MapPin,
  MonitorPlay,
  Pencil,
  Plus,
  Radio,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Field,
  Input,
  Select,
} from "@/components/ui";
import { Modal } from "@/components/ui-client";
import { useNotify } from "@/components/notify";
import { statusLabel, statusTone } from "@/lib/utils";

export type StationManageItem = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: string;
  cameraCount: number;
  recordingCount: number;
  agentOnline: boolean | null;
};

type FormState = {
  code: string;
  name: string;
  location: string;
  status: string;
};

const STATUS_OPTIONS = [
  { value: "ready", label: "พร้อมใช้" },
  { value: "disabled", label: "ปิดการใช้งาน" },
  { value: "warning", label: "ต้องตรวจ" },
  { value: "offline", label: "ออฟไลน์" },
  { value: "blocked", label: "ถูกบล็อก" },
  { value: "camera_error", label: "กล้องมีปัญหา" },
  { value: "disk_full", label: "ดิสก์เต็ม" },
] as const;

const emptyForm: FormState = {
  code: "",
  name: "",
  location: "",
  status: "disabled",
};

export function StationsManager({
  tenantSlug,
  canManage,
  stations,
}: {
  tenantSlug: string;
  canManage: boolean;
  stations: StationManageItem[];
}) {
  const router = useRouter();
  const { confirm, alert, toast } = useNotify();
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const editingStation = useMemo(
    () => stations.find((s) => s.id === editingId) ?? null,
    [stations, editingId],
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowCreate(true);
  }

  function openEdit(station: StationManageItem) {
    setShowCreate(false);
    setEditingId(station.id);
    setForm({
      code: station.code,
      name: station.name,
      location: station.location || "",
      status:
        station.status === "recording" ||
        station.status === "uploading" ||
        station.status === "syncing"
          ? "ready"
          : station.status === "idle"
            ? "ready"
            : station.status,
    });
  }

  function closeForm() {
    setShowCreate(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/stations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          location: form.location,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "เพิ่มสถานีไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          tone: "danger",
        });
        return;
      }
      closeForm();
      toast({ title: "เพิ่มสถานีแล้ว", description: data.station?.code, tone: "success" });
      router.refresh();
    } catch {
      await alert({
        title: "เพิ่มสถานีไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
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
      const res = await fetch(`/api/t/${tenantSlug}/stations/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          location: form.location,
          status: form.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "แก้ไขสถานีไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          tone: "danger",
        });
        return;
      }
      closeForm();
      toast({ title: "บันทึกการแก้ไขแล้ว", tone: "success" });
      router.refresh();
    } catch {
      await alert({
        title: "แก้ไขสถานีไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(station: StationManageItem) {
    const isRecording = station.status === "recording";
    const ok = await confirm({
      title: isRecording ? "กำลังอัดอยู่ — ยืนยันที่จะลบหรือไม่?" : `ลบสถานี ${station.code}?`,
      description: isRecording
        ? `สถานี ${station.code} กำลังอัดวิดีโออยู่ หากลบ การอัดจะถูกยกเลิก และสถานี «${station.name}» จะถูกลบออกจากระบบ`
        : `จะลบ «${station.name}» ออกจากระบบ ถ้ายังมีวิดีโอบันทึกอยู่จะลบไม่ได้`,
      confirmLabel: "ลบสถานี",
      cancelLabel: "ยกเลิก",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/stations/${station.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ลบสถานีไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          tone: "warning",
        });
        return;
      }
      if (editingId === station.id) closeForm();
      toast({ title: "ลบสถานีแล้ว", description: station.code, tone: "success" });
      router.refresh();
    } catch {
      await alert({
        title: "ลบสถานีไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  const fields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="รหัสสถานี" required>
        <Input
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          placeholder="ST-03"
          required
        />
      </Field>
      <Field label="ชื่อสถานี" required>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="โต๊ะแพ็ค 3"
          required
        />
      </Field>
      <Field label="ตำแหน่งในคลัง" className="sm:col-span-2">
        <Input
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          placeholder="ชั้น 1 โซน A"
        />
      </Field>
      {editingId ? (
        <Field label="สถานะ" className="sm:col-span-2">
          <Select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">เพิ่ม แก้ไข หรือลบสถานีแพ็คขององค์กร</p>
          <Button type="button" onClick={openCreate} disabled={busy} icon={Plus}>
            เพิ่มสถานี
          </Button>
        </div>
      )}

      {stations.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="ยังไม่มีสถานีแพ็ค"
          description="สร้างสถานีแรกเพื่อกำหนดจุดบันทึกวิดีโอในคลังของคุณ"
          action={
            canManage ? (
              <Button type="button" onClick={openCreate} icon={Plus}>
                เพิ่มสถานี
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {stations.map((station) => (
            <div
              key={station.id}
              className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-ink">
                      {station.code}
                    </h3>
                    <Badge tone={statusTone(station.status)} dot>
                      {statusLabel(station.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[13px] text-ink-2">{station.name}</p>
                  {station.location ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <MapPin size={12} />
                      {station.location}
                    </p>
                  ) : null}
                </div>

                {station.agentOnline != null ? (
                  <Badge tone={station.agentOnline ? "success" : "danger"} icon={Radio}>
                    {station.agentOnline ? "Agent ออนไลน์" : "Agent ออฟไลน์"}
                  </Badge>
                ) : null}
              </div>

              <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Camera size={13} className="text-muted" />
                  <dt className="text-muted">กล้อง</dt>
                  <dd className="tabular font-medium text-ink">{station.cameraCount}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Film size={13} className="text-muted" />
                  <dt className="text-muted">วิดีโอ</dt>
                  <dd className="tabular font-medium text-ink">{station.recordingCount}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink
                  href={`/t/${tenantSlug}/station/${station.id}`}
                  variant="secondary"
                  size="sm"
                  icon={MonitorPlay}
                >
                  เปิด Console
                </ButtonLink>
                {canManage && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Pencil}
                      onClick={() => openEdit(station)}
                      disabled={busy || station.status === "recording"}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                      onClick={() => void handleDelete(station)}
                      disabled={busy}
                    >
                      ลบ
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showCreate && canManage}
        onClose={closeForm}
        title="เพิ่มสถานีใหม่"
        description="กำหนดรหัสและตำแหน่งของสถานีแพ็ค"
        icon={Plus}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeForm} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" form="station-create" loading={busy}>
              บันทึก
            </Button>
          </>
        }
      >
        <form id="station-create" onSubmit={submitCreate}>
          {fields}
        </form>
      </Modal>

      <Modal
        open={Boolean(editingStation) && canManage}
        onClose={closeForm}
        title={`แก้ไขสถานี ${editingStation?.code ?? ""}`}
        description="ปรับข้อมูลและสถานะการใช้งานของสถานี"
        icon={Pencil}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeForm} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" form="station-edit" loading={busy}>
              บันทึกการแก้ไข
            </Button>
          </>
        }
      >
        <form id="station-edit" onSubmit={submitEdit}>
          {fields}
        </form>
      </Modal>
    </div>
  );
}

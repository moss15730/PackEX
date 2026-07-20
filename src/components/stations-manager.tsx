"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { statusLabel } from "@/lib/utils";

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
  { value: "idle", label: "ว่าง" },
  { value: "ready", label: "พร้อมใช้" },
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
  status: "idle",
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
          ? "idle"
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
      title: isRecording
        ? "กำลังอัดอยู่ — ยืนยันที่จะลบหรือไม่?"
        : `ลบสถานี ${station.code}?`,
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

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            เพิ่ม แก้ไข หรือลบสถานีแพ็คขององค์กร
          </p>
          <Button type="button" onClick={openCreate} disabled={busy || showCreate}>
            เพิ่มสถานี
          </Button>
        </div>
      )}

      {showCreate && canManage && (
        <Card>
          <h2 className="mb-4 font-semibold text-[var(--ink)]">เพิ่มสถานีใหม่</h2>
          <form onSubmit={submitCreate} className="grid gap-3 sm:grid-cols-2">
            <Field
              label="รหัสสถานี"
              value={form.code}
              onChange={(v) => setForm((f) => ({ ...f, code: v }))}
              placeholder="ST-03"
              required
            />
            <Field
              label="ชื่อสถานี"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="โต๊ะแพ็ค 3"
              required
            />
            <Field
              label="ตำแหน่ง"
              value={form.location}
              onChange={(v) => setForm((f) => ({ ...f, location: v }))}
              placeholder="ชั้น 1 โซน A"
              className="sm:col-span-2"
            />
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                บันทึก
              </Button>
              <Button type="button" variant="outline" onClick={closeForm} disabled={busy}>
                ยกเลิก
              </Button>
            </div>
          </form>
        </Card>
      )}

      {editingStation && canManage && (
        <Card>
          <h2 className="mb-4 font-semibold text-[var(--ink)]">
            แก้ไขสถานี {editingStation.code}
          </h2>
          <form onSubmit={submitEdit} className="grid gap-3 sm:grid-cols-2">
            <Field
              label="รหัสสถานี"
              value={form.code}
              onChange={(v) => setForm((f) => ({ ...f, code: v }))}
              required
            />
            <Field
              label="ชื่อสถานี"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              required
            />
            <Field
              label="ตำแหน่ง"
              value={form.location}
              onChange={(v) => setForm((f) => ({ ...f, location: v }))}
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                สถานะ
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                บันทึกการแก้ไข
              </Button>
              <Button type="button" variant="outline" onClick={closeForm} disabled={busy}>
                ยกเลิก
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {stations.map((station) => (
          <Card key={station.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
                    {station.code} — {station.name}
                  </h2>
                  <Badge
                    tone={
                      station.status === "idle" || station.status === "ready"
                        ? "success"
                        : station.status === "blocked" || station.status === "offline"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {statusLabel(station.status)}
                  </Badge>
                </div>
                {station.location && (
                  <p className="mt-1 text-sm text-[var(--muted)]">{station.location}</p>
                )}
                <p className="mt-2 text-xs text-[var(--muted)]">
                  กล้อง {station.cameraCount} · วิดีโอ {station.recordingCount}
                  {station.agentOnline != null &&
                    ` · Agent ${station.agentOnline ? "ออนไลน์" : "ออฟไลน์"}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/t/${tenantSlug}/station/${station.id}`}>
                  <Button type="button" variant="outline" className="text-sm">
                    เปิด Console
                  </Button>
                </Link>
                {canManage && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-sm"
                      onClick={() => openEdit(station)}
                      disabled={busy || station.status === "recording"}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="text-sm"
                      onClick={() => void handleDelete(station)}
                      disabled={busy}
                    >
                      ลบ
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}

        {stations.length === 0 && (
          <Card>
            <p className="text-center text-sm text-[var(--muted)]">
              ยังไม่มีสถานี
              {canManage ? " — กด «เพิ่มสถานี» เพื่อเริ่มต้น" : ""}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, TableScroll } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { roleLabel } from "@/lib/utils";

export type EmployeeItem = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  status: string;
  stationAccess: string | null;
};

export type StationOption = {
  id: string;
  code: string;
  name: string;
};

type FormState = {
  name: string;
  employeeCode: string;
  email: string;
  password: string;
  role: string;
  status: string;
  allStations: boolean;
  stationIds: string[];
};

const ROLE_OPTIONS = [
  { value: "tenant_admin", label: "Tenant Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "packer", label: "Packer" },
  { value: "viewer", label: "Viewer" },
  { value: "claim_officer", label: "Claim Officer" },
] as const;

const emptyForm: FormState = {
  name: "",
  employeeCode: "",
  email: "",
  password: "",
  role: "packer",
  status: "active",
  allStations: true,
  stationIds: [],
};

function stationAccessLabel(access: string | null, stations: StationOption[]) {
  if (!access || access === "*") return "ทุกสถานี";
  const ids = access.split(",").filter(Boolean);
  return ids
    .map((id) => {
      const station = stations.find((s) => s.id === id);
      return station ? `${station.code} (${station.name})` : id;
    })
    .join(", ");
}

function parseStationAccess(access: string | null) {
  if (!access || access === "*") {
    return { allStations: true, stationIds: [] as string[] };
  }
  return { allStations: false, stationIds: access.split(",").filter(Boolean) };
}

export function EmployeesManager({
  tenantSlug,
  currentUserId,
  employees,
  stations,
}: {
  tenantSlug: string;
  currentUserId: string;
  employees: EmployeeItem[];
  stations: StationOption[];
}) {
  const router = useRouter();
  const { confirm, alert, toast } = useNotify();
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const editingEmployee = useMemo(
    () => employees.find((e) => e.id === editingId) ?? null,
    [employees, editingId],
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowCreate(true);
  }

  function openEdit(employee: EmployeeItem) {
    const access = parseStationAccess(employee.stationAccess);
    setShowCreate(false);
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      employeeCode: employee.employeeCode,
      email: employee.email,
      password: "",
      role: employee.role,
      status: employee.status,
      allStations: access.allStations,
      stationIds: access.stationIds,
    });
  }

  function closeForm() {
    setShowCreate(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleStation(stationId: string) {
    setForm((f) => ({
      ...f,
      stationIds: f.stationIds.includes(stationId)
        ? f.stationIds.filter((id) => id !== stationId)
        : [...f.stationIds, stationId],
    }));
  }

  function payloadFromForm(includePassword: boolean) {
    return {
      name: form.name,
      employeeCode: form.employeeCode,
      email: form.email,
      ...(includePassword && form.password ? { password: form.password } : {}),
      role: form.role,
      status: form.status,
      allStations: form.allStations,
      stationIds: form.stationIds,
    };
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(true)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "เพิ่มพนักงานไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      closeForm();
      toast({ title: "เพิ่มพนักงานแล้ว", description: data.employee?.employeeCode, tone: "success" });
      router.refresh();
    } catch {
      await alert({
        title: "เพิ่มพนักงานไม่สำเร็จ",
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
      const res = await fetch(`/api/t/${tenantSlug}/employees/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(Boolean(form.password))),
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
      closeForm();
      toast({ title: "บันทึกการแก้ไขแล้ว", tone: "success" });
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

  async function handleDelete(employee: EmployeeItem) {
    const ok = await confirm({
      title: `ลบพนักงาน ${employee.employeeCode}?`,
      description: `จะลบ «${employee.name}» (${employee.email}) ออกจากระบบ ถ้ามีวิดีโออัดอยู่จะลบไม่ได้`,
      confirmLabel: "ลบพนักงาน",
      cancelLabel: "ยกเลิก",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/employees/${employee.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ลบไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "warning",
        });
        return;
      }
      if (editingId === employee.id) closeForm();
      toast({ title: "ลบพนักงานแล้ว", tone: "success" });
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
          เพิ่ม แก้ไข ลบพนักงาน และตั้งรหัสให้เข้าใช้ระบบด้วยอีเมล
        </p>
        <Button type="button" className="w-full sm:w-auto" onClick={openCreate} disabled={busy || showCreate}>
          เพิ่มพนักงาน
        </Button>
      </div>

      {showCreate && (
        <EmployeeForm
          title="เพิ่มพนักงานใหม่"
          isCreate
          form={form}
          setForm={setForm}
          stations={stations}
          busy={busy}
          onSubmit={submitCreate}
          onCancel={closeForm}
          toggleStation={toggleStation}
        />
      )}

      {editingEmployee && (
        <EmployeeForm
          title={`แก้ไข ${editingEmployee.employeeCode}`}
          isCreate={false}
          form={form}
          setForm={setForm}
          stations={stations}
          busy={busy}
          onSubmit={submitEdit}
          onCancel={closeForm}
          toggleStation={toggleStation}
        />
      )}

      <div className="space-y-3 md:hidden">
        {employees.map((employee) => (
          <Card key={employee.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-[var(--muted)]">{employee.employeeCode}</p>
                <p className="font-medium text-[var(--ink)]">{employee.name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{employee.email}</p>
              </div>
              <Badge tone={employee.status === "active" ? "success" : "danger"}>
                {employee.status === "active" ? "ใช้งาน" : "ปิดใช้"}
              </Badge>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {roleLabel(employee.role)} · {stationAccessLabel(employee.stationAccess, stations)}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => openEdit(employee)}
              >
                แก้ไข
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-red-600"
                disabled={busy || employee.id === currentUserId}
                onClick={() => void handleDelete(employee)}
              >
                ลบ
              </Button>
            </div>
          </Card>
        ))}
        {employees.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--muted)]">ยังไม่มีพนักงาน</p>
        )}
      </div>

      <div className="hidden md:block">
      <TableScroll minWidthClassName="min-w-[900px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">รหัส</th>
              <th className="px-4 py-3 font-medium">ชื่อ</th>
              <th className="px-4 py-3 font-medium">อีเมล</th>
              <th className="px-4 py-3 font-medium">บทบาท</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">สถานี</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{employee.employeeCode}</td>
                <td className="px-4 py-3 font-medium">{employee.name}</td>
                <td className="px-4 py-3">{employee.email}</td>
                <td className="px-4 py-3">{roleLabel(employee.role)}</td>
                <td className="px-4 py-3">
                  <Badge tone={employee.status === "active" ? "success" : "danger"}>
                    {employee.status === "active" ? "ใช้งาน" : "ปิดใช้"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {stationAccessLabel(employee.stationAccess, stations)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="px-2 py-1 text-xs"
                      disabled={busy}
                      onClick={() => openEdit(employee)}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-2 py-1 text-xs text-red-600"
                      disabled={busy || employee.id === currentUserId}
                      onClick={() => void handleDelete(employee)}
                    >
                      ลบ
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--muted)]">ยังไม่มีพนักงาน</p>
        )}
      </TableScroll>
      </div>
    </div>
  );
}

function EmployeeForm({
  title,
  isCreate,
  form,
  setForm,
  stations,
  busy,
  onSubmit,
  onCancel,
  toggleStation,
}: {
  title: string;
  isCreate: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  stations: StationOption[];
  busy: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  toggleStation: (stationId: string) => void;
}) {
  return (
    <Card>
      <h2 className="mb-4 font-semibold text-[var(--ink)]">{title}</h2>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label="ชื่อ" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
        <Field
          label="รหัสพนักงาน"
          value={form.employeeCode}
          onChange={(v) => setForm((f) => ({ ...f, employeeCode: v }))}
          placeholder="EMP-005"
          required
        />
        <Field
          label="อีเมล"
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          required
        />
        <Field
          label={isCreate ? "รหัสผ่าน" : "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)"}
          type="password"
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
          required={isCreate}
        />
        <SelectField
          label="บทบาท"
          value={form.role}
          onChange={(v) => setForm((f) => ({ ...f, role: v }))}
          options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
        />
        <SelectField
          label="สถานะ"
          value={form.status}
          onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          options={[
            { value: "active", label: "ใช้งาน" },
            { value: "disabled", label: "ปิดใช้" },
          ]}
        />
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            สถานีที่เข้าใช้ได้
          </p>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allStations}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  allStations: e.target.checked,
                  stationIds: e.target.checked ? [] : f.stationIds,
                }))
              }
            />
            ทุกสถานี
          </label>
          {!form.allStations && (
            <div className="grid gap-2 sm:grid-cols-2">
              {stations.map((station) => (
                <label key={station.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.stationIds.includes(station.id)}
                    onChange={() => toggleStation(station.id)}
                  />
                  {station.code} — {station.name}
                </label>
              ))}
              {stations.length === 0 && (
                <p className="text-sm text-[var(--muted)]">ยังไม่มีสถานี — สร้างสถานีก่อน</p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            บันทึก
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

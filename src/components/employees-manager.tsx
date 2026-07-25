"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserPlus, Users } from "lucide-react";
import {
  Avatar,
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
  Tr,
} from "@/components/ui";
import { Modal } from "@/components/ui-client";
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

  const employeeFormFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="ชื่อ-นามสกุล" required>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </Field>
      <Field label="รหัสพนักงาน" required>
        <Input
          value={form.employeeCode}
          onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))}
          placeholder="EMP-005"
          required
        />
      </Field>
      <Field label="อีเมล" required>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
      </Field>
      <Field
        label={showCreate ? "รหัสผ่าน" : "รหัสผ่านใหม่"}
        required={showCreate}
        hint={showCreate ? undefined : "เว้นว่างถ้าไม่ต้องการเปลี่ยน"}
      >
        <Input
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required={showCreate}
        />
      </Field>
      <Field label="บทบาท">
        <Select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="สถานะ">
        <Select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="active">ใช้งาน</option>
          <option value="disabled">ปิดใช้</option>
        </Select>
      </Field>

      <div className="sm:col-span-2">
        <p className="mb-2 text-[13px] font-medium text-ink">สถานีที่เข้าใช้ได้</p>
        <label className="mb-2 flex cursor-pointer items-center gap-2.5 text-sm text-ink-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--brand)]"
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
              <label
                key={station.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-2 transition hover:bg-subtle has-checked:border-brand-border has-checked:bg-brand-soft/60"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--brand)]"
                  checked={form.stationIds.includes(station.id)}
                  onChange={() => toggleStation(station.id)}
                />
                <span className="truncate">
                  {station.code} — {station.name}
                </span>
              </label>
            ))}
            {stations.length === 0 && (
              <p className="text-sm text-muted">ยังไม่มีสถานี — สร้างสถานีก่อน</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          เพิ่ม แก้ไข ลบพนักงาน และกำหนดสิทธิ์เข้าใช้แต่ละสถานี
        </p>
        <Button type="button" onClick={openCreate} disabled={busy} icon={UserPlus}>
          เพิ่มพนักงาน
        </Button>
      </div>

      {employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="ยังไม่มีพนักงาน"
          description="เพิ่มบัญชีพนักงานเพื่อให้ทีมเข้าใช้ระบบและบันทึกการแพ็คได้"
          action={
            <Button type="button" onClick={openCreate} icon={UserPlus}>
              เพิ่มพนักงาน
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="rounded-xl border border-line bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={employee.name} size={38} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{employee.name}</p>
                      <p className="truncate text-[13px] text-muted">{employee.email}</p>
                      <p className="mt-0.5 font-mono text-xs text-faint">
                        {employee.employeeCode}
                      </p>
                    </div>
                  </div>
                  <Badge tone={employee.status === "active" ? "success" : "danger"} dot>
                    {employee.status === "active" ? "ใช้งาน" : "ปิดใช้"}
                  </Badge>
                </div>

                <p className="mt-3 text-[13px] text-muted">
                  {roleLabel(employee.role)} ·{" "}
                  {stationAccessLabel(employee.stationAccess, stations)}
                </p>

                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={Pencil}
                    className="flex-1"
                    disabled={busy}
                    onClick={() => openEdit(employee)}
                  >
                    แก้ไข
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="flex-1 text-danger-ink hover:bg-danger-soft"
                    disabled={busy || employee.id === currentUserId}
                    onClick={() => void handleDelete(employee)}
                  >
                    ลบ
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <TableCard minWidthClassName="min-w-[900px]">
              <Table>
                <THead>
                  <Th>พนักงาน</Th>
                  <Th>รหัส</Th>
                  <Th>บทบาท</Th>
                  <Th>สถานะ</Th>
                  <Th>สถานีที่เข้าถึงได้</Th>
                  <Th align="right">จัดการ</Th>
                </THead>
                <TBody>
                  {employees.map((employee) => (
                    <Tr key={employee.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={employee.name} size={32} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                              {employee.name}
                            </p>
                            <p className="truncate text-xs text-muted">{employee.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td className="font-mono text-xs">{employee.employeeCode}</Td>
                      <Td>{roleLabel(employee.role)}</Td>
                      <Td>
                        <Badge tone={employee.status === "active" ? "success" : "danger"} dot>
                          {employee.status === "active" ? "ใช้งาน" : "ปิดใช้"}
                        </Badge>
                      </Td>
                      <Td className="max-w-[16rem] truncate text-muted">
                        {stationAccessLabel(employee.stationAccess, stations)}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={Pencil}
                            disabled={busy}
                            onClick={() => openEdit(employee)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                            disabled={busy || employee.id === currentUserId}
                            onClick={() => void handleDelete(employee)}
                          >
                            ลบ
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableCard>
          </div>
        </>
      )}

      <Modal
        open={showCreate}
        onClose={closeForm}
        title="เพิ่มพนักงานใหม่"
        description="สร้างบัญชีและกำหนดสิทธิ์เข้าใช้สถานี"
        icon={UserPlus}
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeForm} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" form="employee-create" loading={busy}>
              บันทึก
            </Button>
          </>
        }
      >
        <form id="employee-create" onSubmit={submitCreate}>
          {employeeFormFields}
        </form>
      </Modal>

      <Modal
        open={Boolean(editingEmployee)}
        onClose={closeForm}
        title={`แก้ไข ${editingEmployee?.name ?? ""}`}
        description={editingEmployee?.employeeCode}
        icon={Pencil}
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeForm} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" form="employee-edit" loading={busy}>
              บันทึกการแก้ไข
            </Button>
          </>
        }
      >
        <form id="employee-edit" onSubmit={submitEdit}>
          {employeeFormFields}
        </form>
      </Modal>
    </div>
  );
}

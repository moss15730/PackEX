"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Callout,
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
import { statusLabel } from "@/lib/utils";

type PlanOption = {
  id: string;
  nameTh: string;
  maxStations: number;
  maxStorageGb: number;
  maxUsers: number;
};

export type TenantListItem = {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: string;
  planId: string | null;
  planName: string | null;
  planMaxStations: number | null;
  planMaxStorageGb: number | null;
  planMaxUsers: number | null;
  maxStations: number | null;
  maxStorageGb: number | null;
  maxUsers: number | null;
  maxStationsOverride: number | null;
  maxStorageGbOverride: number | null;
  maxUsersOverride: number | null;
  stationCount: number;
  userCount: number;
  storageUsedGb: number;
  adminUserId: string | null;
  adminEmail: string | null;
  adminName: string | null;
  adminEmployeeCode: string | null;
};

function statusTone(status: string): "success" | "danger" | "neutral" | "warning" {
  if (status === "active") return "success";
  if (status === "suspended") return "danger";
  if (status === "trial") return "warning";
  return "neutral";
}

export function PlatformTenantsManager({
  tenants,
  plans,
}: {
  tenants: TenantListItem[];
  plans: PlanOption[];
}) {
  const router = useRouter();
  const { confirm, alert, toast } = useNotify();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = useMemo(
    () => (editingId ? tenants.find((t) => t.id === editingId) ?? null : null),
    [editingId, tenants],
  );

  const defaultPlanId = plans[0]?.id ?? "";

  const [slug, setSlug] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [planId, setPlanId] = useState(defaultPlanId);
  const [adminName, setAdminName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [editName, setEditName] = useState("");
  const [editPlanId, setEditPlanId] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editMaxStations, setEditMaxStations] = useState("");
  const [editMaxStorageGb, setEditMaxStorageGb] = useState("");
  const [editMaxUsers, setEditMaxUsers] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [editAdminPassword, setEditAdminPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  function resetCreate() {
    setSlug("");
    setTenantName("");
    setPlanId(defaultPlanId);
    setAdminName("");
    setEmployeeCode("");
    setAdminEmail("");
    setAdminPassword("");
    setShowCreate(false);
    setError(null);
  }

  function startEdit(t: TenantListItem) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditPlanId(t.planId ?? defaultPlanId);
    setEditStatus(t.status);
    setEditMaxStations(
      t.maxStationsOverride != null ? String(t.maxStationsOverride) : "",
    );
    setEditMaxStorageGb(
      t.maxStorageGbOverride != null ? String(t.maxStorageGbOverride) : "",
    );
    setEditMaxUsers(t.maxUsersOverride != null ? String(t.maxUsersOverride) : "");
    setEditAdminEmail(t.adminEmail ?? "");
    setEditAdminPassword("");
    setShowEditPassword(false);
    setShowCreate(false);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAdminEmail("");
    setEditAdminPassword("");
    setShowEditPassword(false);
    setError(null);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: tenantName,
          planId,
          tenantAdmin: {
            name: adminName || "Tenant Admin",
            employeeCode,
            email: adminEmail,
            password: adminPassword,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "สร้างองค์กรไม่สำเร็จ");
        return;
      }
      toast({ title: "สร้างองค์กรแล้ว", description: slug, tone: "success" });
      resetCreate();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/platform/tenants/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          planId: editPlanId,
          status: editStatus,
          quota: {
            maxStations: editMaxStations.trim() ? Number(editMaxStations) : null,
            maxStorageGb: editMaxStorageGb.trim() ? Number(editMaxStorageGb) : null,
            maxUsers: editMaxUsers.trim() ? Number(editMaxUsers) : null,
          },
          tenantAdmin: editing?.adminUserId
            ? {
                email: editAdminEmail,
                ...(editAdminPassword.trim()
                  ? { password: editAdminPassword.trim() }
                  : {}),
              }
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "แก้ไขไม่สำเร็จ");
        return;
      }
      toast({ title: "บันทึกองค์กรแล้ว", description: editing?.slug, tone: "success" });
      cancelEdit();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSuspend(t: TenantListItem) {
    const suspend = t.status !== "suspended";
    const ok = await confirm({
      title: suspend ? `ปิดใช้งาน ${t.slug}?` : `เปิดใช้งาน ${t.slug}?`,
      description: suspend
        ? "ผู้ใช้ในองค์กรนี้จะไม่สามารถเข้าสู่ระบบได้"
        : "องค์กรจะกลับมาใช้งานได้ตามปกติ",
      confirmLabel: suspend ? "ปิดใช้งาน" : "เปิดใช้งาน",
      cancelLabel: "ยกเลิก",
      tone: suspend ? "warning" : "info",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/platform/tenants/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: suspend ? "suspended" : "active" }),
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
        title: suspend ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว",
        description: t.slug,
        tone: "success",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(t: TenantListItem) {
    const ok = await confirm({
      title: `ลบองค์กร ${t.slug}?`,
      description: "องค์กรและข้อมูลทั้งหมดจะถูกลบถาวร — ไม่สามารถกู้คืนได้",
      confirmLabel: "ลบ",
      cancelLabel: "ยกเลิก",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/platform/tenants/${t.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ลบไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      toast({ title: "ลบองค์กรแล้ว", description: t.slug, tone: "success" });
      if (editingId === t.id) cancelEdit();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const usageLine = (t: TenantListItem) =>
    `สถานี ${t.stationCount}${t.maxStations != null ? `/${t.maxStations}` : ""} · ผู้ใช้ ${t.userCount}${
      t.maxUsers != null ? `/${t.maxUsers}` : ""
    } · ${t.storageUsedGb.toFixed(1)} GB${t.maxStorageGb != null ? `/${t.maxStorageGb} GB` : ""}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">จัดการองค์กร แผนบริการ โควต้า และสถานะการใช้งาน</p>
        <Button type="button" onClick={() => setShowCreate(true)} disabled={busy} icon={Plus}>
          สร้างองค์กร
        </Button>
      </div>

      {error ? (
        <Callout tone="danger" icon={AlertTriangle}>
          {error}
        </Callout>
      ) : null}

      {tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="ยังไม่มีองค์กร"
          description="สร้าง tenant แรกเพื่อเริ่มให้บริการบนแพลตฟอร์ม"
          action={
            <Button type="button" onClick={() => setShowCreate(true)} icon={Plus}>
              สร้างองค์กร
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <TableCard
              minWidthClassName="min-w-[960px]"
              header={
                <Toolbar
                  actions={<span className="text-xs text-muted">{tenants.length} องค์กร</span>}
                >
                  <span className="text-[13px] font-medium text-ink">องค์กรทั้งหมด</span>
                </Toolbar>
              }
            >
              <Table>
                <THead>
                  <Th>องค์กร</Th>
                  <Th>สถานะ</Th>
                  <Th>แผน</Th>
                  <Th align="right">พื้นที่</Th>
                  <Th align="right">สถานี / ผู้ใช้</Th>
                  <Th align="right">สร้างเมื่อ</Th>
                  <Th align="right">จัดการ</Th>
                </THead>
                <TBody>
                  {tenants.map((t) => (
                    <Tr key={t.id}>
                      <Td>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{t.name}</p>
                          <p className="font-mono text-xs text-muted">{t.slug}</p>
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={statusTone(t.status)} dot>
                          {statusLabel(t.status)}
                        </Badge>
                      </Td>
                      <Td>{t.planName ?? "—"}</Td>
                      <Td align="right" className="tabular">
                        {t.storageUsedGb.toFixed(1)}
                        {t.maxStorageGb != null ? ` / ${t.maxStorageGb} GB` : " GB"}
                      </Td>
                      <Td align="right" className="tabular">
                        {t.stationCount}
                        {t.maxStations != null ? `/${t.maxStations}` : ""} · {t.userCount}
                        {t.maxUsers != null ? `/${t.maxUsers}` : ""}
                      </Td>
                      <Td align="right" className="text-muted">
                        {format(new Date(t.createdAt), "d MMM yyyy", { locale: th })}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={Pencil}
                            disabled={busy}
                            onClick={() => startEdit(t)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={t.status === "suspended" ? PlayCircle : PauseCircle}
                            disabled={busy}
                            onClick={() => void toggleSuspend(t)}
                          >
                            {t.status === "suspended" ? "เปิดใช้" : "ปิดใช้"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                            disabled={busy}
                            onClick={() => void handleDelete(t)}
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

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {tenants.map((t) => (
              <div key={t.id} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{t.name}</p>
                    <p className="font-mono text-xs text-muted">{t.slug}</p>
                  </div>
                  <Badge tone={statusTone(t.status)} dot>
                    {statusLabel(t.status)}
                  </Badge>
                </div>
                <p className="mt-2.5 text-[13px] text-muted">
                  {t.planName ?? "ไม่มีแผน"} · {usageLine(t)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={Pencil}
                    className="flex-1"
                    disabled={busy}
                    onClick={() => startEdit(t)}
                  >
                    แก้ไข
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => void toggleSuspend(t)}
                  >
                    {t.status === "suspended" ? "เปิดใช้" : "ปิดใช้"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                    disabled={busy}
                    onClick={() => void handleDelete(t)}
                  >
                    ลบ
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={resetCreate}
        title="สร้างองค์กรใหม่"
        description="กำหนดแพ็กเกจและบัญชีผู้ดูแลเริ่มต้น"
        icon={Building2}
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={resetCreate} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" form="tenant-create" loading={busy}>
              สร้างองค์กร
            </Button>
          </>
        }
      >
        <form id="tenant-create" onSubmit={submitCreate} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug" required hint="ใช้เป็น URL ของ tenant">
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme"
                className="font-mono"
                required
              />
            </Field>
            <Field label="ชื่อองค์กร" required>
              <Input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
              />
            </Field>
            <Field label="แพ็กเกจ" className="sm:col-span-2">
              <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameTh} · {p.maxStorageGb} GB
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="border-t border-line pt-5">
            <p className="mb-3 text-[13px] font-medium text-ink">Tenant admin เริ่มต้น</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อผู้ดูแล">
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
              </Field>
              <Field label="รหัสพนักงาน" required>
                <Input
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="EMP-001"
                  required
                />
              </Field>
              <Field label="อีเมล" required>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@tenant.local"
                  required
                />
              </Field>
              <Field label="รหัสผ่าน" required hint="อย่างน้อย 8 ตัวอักษร">
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={Boolean(editing)}
        onClose={cancelEdit}
        title={`แก้ไของค์กร ${editing?.name ?? ""}`}
        description={editing?.slug}
        icon={Pencil}
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={cancelEdit} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" form="tenant-edit" loading={busy}>
              บันทึก
            </Button>
          </>
        }
      >
        {editing ? (
          <form id="tenant-edit" onSubmit={submitEdit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อองค์กร" required>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </Field>
              <Field label="สถานะ">
                <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="trial">ทดลองใช้</option>
                  <option value="active">ใช้งาน</option>
                  <option value="suspended">ระงับ</option>
                </Select>
              </Field>
              <Field label="แพ็กเกจ" className="sm:col-span-2">
                <Select value={editPlanId} onChange={(e) => setEditPlanId(e.target.value)}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameTh} · {p.maxStorageGb} GB · ผู้ใช้สูงสุด {p.maxUsers}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="border-t border-line pt-5">
              <p className="mb-1 text-[13px] font-medium text-ink">Tenant admin</p>
              {editing.adminUserId ? (
                <>
                  {editing.adminName ? (
                    <p className="mb-3 text-xs text-muted">
                      {editing.adminName}
                      {editing.adminEmployeeCode ? ` · ${editing.adminEmployeeCode}` : ""}
                    </p>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="อีเมล" required>
                      <Input
                        type="email"
                        value={editAdminEmail}
                        onChange={(e) => setEditAdminEmail(e.target.value)}
                        required
                      />
                    </Field>
                    <Field
                      label="รหัสผ่านใหม่"
                      hint="เว้นว่างถ้าไม่เปลี่ยน — ระบบไม่เก็บรหัสผ่านแบบอ่านกลับได้"
                    >
                      <div className="relative">
                        <Input
                          value={editAdminPassword}
                          onChange={(e) => setEditAdminPassword(e.target.value)}
                          type={showEditPassword ? "text" : "password"}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword((v) => !v)}
                          aria-label={showEditPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-faint transition hover:text-ink"
                        >
                          {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </Field>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">ไม่พบ tenant admin ในองค์กรนี้</p>
              )}
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-soft/60 p-4">
              <p className="text-[13px] font-semibold text-ink">โควต้าเฉพาะองค์กร</p>
              <p className="mt-0.5 mb-3 text-xs text-muted">
                เว้นว่าง = ใช้ตามแผน · กรอกตัวเลข = กำหนดเองเฉพาะองค์กรนี้
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={`สถานีสูงสุด (แผน: ${editing.planMaxStations ?? "—"})`}>
                  <Input
                    value={editMaxStations}
                    onChange={(e) => setEditMaxStations(e.target.value)}
                    placeholder={String(editing.planMaxStations ?? "")}
                    type="number"
                    min={0}
                  />
                </Field>
                <Field label={`พื้นที่ GB (แผน: ${editing.planMaxStorageGb ?? "—"})`}>
                  <Input
                    value={editMaxStorageGb}
                    onChange={(e) => setEditMaxStorageGb(e.target.value)}
                    placeholder={String(editing.planMaxStorageGb ?? "")}
                    type="number"
                    min={0}
                  />
                </Field>
                <Field label={`ผู้ใช้สูงสุด (แผน: ${editing.planMaxUsers ?? "—"})`}>
                  <Input
                    value={editMaxUsers}
                    onChange={(e) => setEditMaxUsers(e.target.value)}
                    placeholder={String(editing.planMaxUsers ?? "")}
                    type="number"
                    min={0}
                  />
                </Field>
              </div>
            </div>

            <p className="rounded-lg bg-subtle px-3 py-2.5 text-xs text-muted">
              การใช้งานปัจจุบัน — {usageLine(editing)}
            </p>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

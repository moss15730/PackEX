"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge, Button, Card } from "@/components/ui";
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
    setShowCreate(false);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          จัดการองค์กร แผนราคา และสถานะการใช้งาน
        </p>
        {!showCreate && !editingId ? (
          <Button type="button" onClick={() => setShowCreate(true)} disabled={busy}>
            สร้างองค์กร
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {showCreate && (
        <Card>
          <h2 className="mb-4 font-semibold text-[var(--ink)]">สร้างองค์กรใหม่</h2>
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Slug
                </label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="acme"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  ชื่อองค์กร
                </label>
                <input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  แพ็กเกจ
                </label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameTh} · {p.maxStorageGb} GB
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Tenant Admin เริ่มต้น
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="ชื่อผู้ดูแล"
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <input
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="รหัสพนักงาน"
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
                <input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@tenant.local"
                  type="email"
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
                <input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="รหัสผ่าน (≥8)"
                  type="password"
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "กำลังสร้าง..." : "สร้างองค์กร"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetCreate} disabled={busy}>
                ยกเลิก
              </Button>
            </div>
          </form>
        </Card>
      )}

      {editing && (
        <Card>
          <h2 className="mb-1 font-semibold text-[var(--ink)]">แก้ไของค์กร</h2>
          <p className="mb-4 font-mono text-sm text-[var(--muted)]">{editing.slug}</p>
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  ชื่อองค์กร
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  สถานะ
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                >
                  <option value="trial">ทดลองใช้</option>
                  <option value="active">ใช้งาน</option>
                  <option value="suspended">ระงับ</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  แพ็กเกจ
                </label>
                <select
                  value={editPlanId}
                  onChange={(e) => setEditPlanId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameTh} · {p.maxStorageGb} GB · max {p.maxUsers} users
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
              <p className="mb-1 text-sm font-semibold text-[var(--ink)]">
                โควต้าเฉพาะองค์กร
              </p>
              <p className="mb-3 text-xs text-[var(--muted)]">
                ว่าง = ใช้ตามแผน · กรอกตัวเลข = กำหนดเองสำหรับองค์กรนี้เท่านั้น
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    สถานีสูงสุด
                    <span className="ml-1 font-normal">(แผน: {editing.planMaxStations ?? "—"})</span>
                  </label>
                  <input
                    value={editMaxStations}
                    onChange={(e) => setEditMaxStations(e.target.value)}
                    placeholder={String(editing.planMaxStations ?? "")}
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    พื้นที่วิดีโอ (GB)
                    <span className="ml-1 font-normal">(แผน: {editing.planMaxStorageGb ?? "—"})</span>
                  </label>
                  <input
                    value={editMaxStorageGb}
                    onChange={(e) => setEditMaxStorageGb(e.target.value)}
                    placeholder={String(editing.planMaxStorageGb ?? "")}
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    ผู้ใช้สูงสุด
                    <span className="ml-1 font-normal">(แผน: {editing.planMaxUsers ?? "—"})</span>
                  </label>
                  <input
                    value={editMaxUsers}
                    onChange={(e) => setEditMaxUsers(e.target.value)}
                    placeholder={String(editing.planMaxUsers ?? "")}
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
              ใช้งาน: สถานี {editing.stationCount}
              {editing.maxStations != null ? ` / ${editing.maxStations}` : ""}
              {" · "}ผู้ใช้ {editing.userCount}
              {editing.maxUsers != null ? ` / ${editing.maxUsers}` : ""}
              {" · "}พื้นที่ {editing.storageUsedGb.toFixed(1)} GB
              {editing.maxStorageGb != null ? ` / ${editing.maxStorageGb} GB` : ""}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelEdit} disabled={busy}>
                ยกเลิก
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">ชื่อ</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">แผน</th>
              <th className="px-4 py-3 font-medium">พื้นที่</th>
              <th className="px-4 py-3 font-medium">สถานี/ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
              <th className="px-4 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-mono">{t.slug}</td>
                <td className="px-4 py-3">{t.name}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge>
                </td>
                <td className="px-4 py-3">{t.planName ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {t.storageUsedGb.toFixed(1)}
                  {t.maxStorageGb != null ? ` / ${t.maxStorageGb} GB` : ""}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {t.stationCount}
                  {t.maxStations != null ? ` / ${t.maxStations}` : ""} · {t.userCount}
                  {t.maxUsers != null ? ` / ${t.maxUsers}` : ""}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {format(new Date(t.createdAt), "d MMM yyyy", { locale: th })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      disabled={busy}
                      onClick={() => startEdit(t)}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-2 py-1 text-xs"
                      disabled={busy}
                      onClick={() => void toggleSuspend(t)}
                    >
                      {t.status === "suspended" ? "เปิดใช้" : "ปิดใช้"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-2 py-1 text-xs text-rose-600 hover:text-rose-700"
                      disabled={busy}
                      onClick={() => void handleDelete(t)}
                    >
                      ลบ
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tenants.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">ยังไม่มีองค์กร</p>
        )}
      </Card>

      <div className="space-y-3 md:hidden">
        {tenants.map((t) => (
          <Card key={t.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-sm">{t.slug}</div>
                <div className="font-medium text-[var(--ink)]">{t.name}</div>
              </div>
              <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {t.planName ?? "—"} · {t.storageUsedGb.toFixed(1)} GB
              {t.maxStorageGb != null ? ` / ${t.maxStorageGb}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="flex-1 text-sm" disabled={busy} onClick={() => startEdit(t)}>
                แก้ไข
              </Button>
              <Button type="button" variant="outline" className="flex-1 text-sm" disabled={busy} onClick={() => void toggleSuspend(t)}>
                {t.status === "suspended" ? "เปิดใช้" : "ปิดใช้"}
              </Button>
              <Button type="button" variant="outline" className="text-sm text-rose-600" disabled={busy} onClick={() => void handleDelete(t)}>
                ลบ
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

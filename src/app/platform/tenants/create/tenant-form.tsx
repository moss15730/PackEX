"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";

type Plan = {
  id: string;
  nameTh: string;
  nameEn: string;
  maxStorageGb: number;
  maxUsers: number;
  priceMonthly: number;
};

export function CreateTenantForm({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultPlanId = plans[0]?.id ?? "";

  const [slug, setSlug] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [planId, setPlanId] = useState(defaultPlanId);

  const [adminName, setAdminName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId) ?? plans[0],
    [plans, planId],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!slug.trim() || !tenantName.trim()) {
      setError("กรุณากรอก slug และชื่อองค์กร");
      return;
    }
    if (!adminEmail.trim() || !adminPassword) {
      setError("กรุณากรอก Tenant Admin email และรหัสผ่าน");
      return;
    }

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

      router.push("/platform/tenants");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {selectedPlan ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          <div className="font-medium text-[var(--ink)]">Capacity Plan</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[var(--muted)]">
            <span>พื้นที่วิดีโอ: {selectedPlan.maxStorageGb} GB</span>
            <span>ผู้ใช้สูงสุด: {selectedPlan.maxUsers}</span>
            <span>
              ราคา:{" "}
              {selectedPlan.priceMonthly > 0
                ? `฿${selectedPlan.priceMonthly.toLocaleString()}/เดือน`
                : "ติดต่อเรา"}
            </span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : null}

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
            placeholder="ชื่อบริษัท"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            เลือกแพ็กเกจ (กำหนดความจุจัดเก็บวิดีโอ)
          </label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameTh} · {p.maxStorageGb} GB · max users {p.maxUsers}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-2">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="info">Tenant Admin เริ่มต้น</Badge>
          <div className="text-xs text-[var(--muted)]">Platform จะสร้างบัญชีผู้ดูแลขององค์กรนี้</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              ชื่อ
            </label>
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="ชื่อผู้ดูแล"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              รหัสพนักงาน
            </label>
            <input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="EMP-001"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Email
            </label>
            <input
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@tenant.local"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Password
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={busy} className="min-h-11 px-6">
          {busy ? "กำลังสร้าง..." : "สร้างองค์กร"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 px-6"
          disabled={busy}
          onClick={() => router.push("/platform/tenants")}
        >
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}


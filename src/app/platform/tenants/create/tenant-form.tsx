"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, HardDrive, ShieldCheck, Users } from "lucide-react";
import { Button, Callout, Field, Input, Select } from "@/components/ui";

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
    <form onSubmit={submit} className="space-y-8">
      {error ? (
        <Callout tone="danger" icon={AlertTriangle}>
          {error}
        </Callout>
      ) : null}

      {/* Organisation */}
      <section>
        <header className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-subtle text-muted">
            <Building2 size={16} strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">ข้อมูลองค์กร</h2>
            <p className="text-[13px] text-muted">slug จะใช้เป็น URL ของ tenant</p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slug" htmlFor="slug" required hint="ตัวพิมพ์เล็ก ไม่มีช่องว่าง เช่น acme">
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme"
              required
            />
          </Field>
          <Field label="ชื่อองค์กร" htmlFor="tenantName" required>
            <Input
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="บริษัท เอซีเอ็มอี จำกัด"
              required
            />
          </Field>

          <Field
            label="แพ็กเกจ"
            htmlFor="planId"
            className="sm:col-span-2"
            hint="กำหนดความจุจัดเก็บวิดีโอและจำนวนผู้ใช้"
          >
            <Select id="planId" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameTh} · {p.maxStorageGb} GB · ผู้ใช้สูงสุด {p.maxUsers}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {selectedPlan ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-brand-border bg-brand-soft p-4 sm:grid-cols-3">
            <div className="flex items-center gap-2.5">
              <HardDrive size={16} className="text-brand-soft-ink" />
              <div>
                <p className="text-[11px] text-brand-soft-ink/80">พื้นที่วิดีโอ</p>
                <p className="tabular text-sm font-semibold text-brand-soft-ink">
                  {selectedPlan.maxStorageGb} GB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Users size={16} className="text-brand-soft-ink" />
              <div>
                <p className="text-[11px] text-brand-soft-ink/80">ผู้ใช้สูงสุด</p>
                <p className="tabular text-sm font-semibold text-brand-soft-ink">
                  {selectedPlan.maxUsers}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-brand-soft-ink" />
              <div>
                <p className="text-[11px] text-brand-soft-ink/80">ราคา</p>
                <p className="tabular text-sm font-semibold text-brand-soft-ink">
                  {selectedPlan.priceMonthly > 0
                    ? `฿${selectedPlan.priceMonthly.toLocaleString()}/เดือน`
                    : "ติดต่อเรา"}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Admin */}
      <section className="border-t border-line pt-8">
        <header className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-subtle text-muted">
            <ShieldCheck size={16} strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Tenant admin เริ่มต้น</h2>
            <p className="text-[13px] text-muted">
              บัญชีผู้ดูแลคนแรกขององค์กรนี้ — ใช้เข้าสู่ระบบครั้งแรก
            </p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อผู้ดูแล" htmlFor="adminName">
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="ชื่อ-นามสกุล"
            />
          </Field>
          <Field label="รหัสพนักงาน" htmlFor="employeeCode" required>
            <Input
              id="employeeCode"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="EMP-001"
              required
            />
          </Field>
          <Field label="อีเมล" htmlFor="adminEmail" required>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@tenant.local"
              required
            />
          </Field>
          <Field label="รหัสผ่าน" htmlFor="adminPassword" required hint="อย่างน้อย 8 ตัวอักษร">
            <Input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-line pt-6">
        <Button type="submit" size="lg" loading={busy}>
          {busy ? "กำลังสร้าง…" : "สร้างองค์กร"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={busy}
          onClick={() => router.push("/platform/tenants")}
        >
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}

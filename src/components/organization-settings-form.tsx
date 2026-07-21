"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { statusLabel } from "@/lib/utils";

type TenantInfo = {
  name: string;
  slug: string;
  locale: string;
  timezone: string;
  status: string;
};

export function OrganizationSettingsForm({
  tenant,
  tenantSlug,
}: {
  tenant: TenantInfo;
  tenantSlug: string;
}) {
  const router = useRouter();
  const { toast } = useNotify();
  const [name, setName] = useState(tenant.name);
  const [locale, setLocale] = useState(tenant.locale);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/organization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, locale, timezone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "บันทึกไม่สำเร็จ", tone: "danger" });
        return;
      }
      toast({ title: "บันทึกข้อมูลองค์กรแล้ว", tone: "success" });
      router.refresh();
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ink)]">ชื่อองค์กร</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">Slug</label>
          <p className="font-mono text-sm text-[var(--ink)]">{tenant.slug}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ink)]">ภาษา</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
          >
            <option value="th">ไทย</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
          >
            <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
            <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">สถานะ</span>
          <span className="font-medium">{statusLabel(tenant.status)}</span>
        </div>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </form>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type Grant = {
  id: string;
  reason: string;
  grantedTo: string;
  expiresAt: string;
  revokedAt: string | null;
  tenant: { slug: string; name: string };
};

export function PlatformSupportManager({ grants: initial }: { grants: Grant[] }) {
  const router = useRouter();
  const { toast } = useNotify();
  const [tenantSlug, setTenantSlug] = useState("");
  const [reason, setReason] = useState("");
  const [grantedTo, setGrantedTo] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [busy, setBusy] = useState(false);

  async function createGrant(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/platform/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, reason, grantedTo, expiresInHours: Number(expiresInHours) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "สร้างไม่สำเร็จ", tone: "danger" });
        return;
      }
      setTenantSlug("");
      setReason("");
      setGrantedTo("");
      toast({ title: "สร้าง grant แล้ว", tone: "success" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/platform/support/${id}`, { method: "PATCH" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 font-semibold text-[var(--ink)]">สร้าง Support Grant</h2>
        <form onSubmit={createGrant} className="grid gap-3 sm:grid-cols-2">
          <input
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="tenant slug"
            required
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
          />
          <input
            value={grantedTo}
            onChange={(e) => setGrantedTo(e.target.value)}
            placeholder="อีเมล support"
            required
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เหตุผล"
            required
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)] sm:col-span-2"
          />
          <input
            type="number"
            min={1}
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(e.target.value)}
            placeholder="ชั่วโมง"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
          />
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "กำลังสร้าง…" : "สร้าง Grant"}
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {initial.map((g) => {
          const expired = new Date(g.expiresAt) < new Date();
          const revoked = !!g.revokedAt;
          return (
            <Card key={g.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono">{g.tenant.slug}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={revoked ? "neutral" : expired ? "danger" : "success"}>
                    {revoked ? "ยกเลิกแล้ว" : expired ? "หมดอายุ" : "ใช้งานได้"}
                  </Badge>
                  {!revoked && !expired && (
                    <Button variant="outline" className="text-xs" onClick={() => void revoke(g.id)}>
                      ยกเลิก
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{g.reason}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                ให้กับ {g.grantedTo} · หมดอายุ{" "}
                {format(new Date(g.expiresAt), "d MMM yyyy HH:mm", { locale: th })}
              </p>
            </Card>
          );
        })}
        {initial.length === 0 && (
          <p className="text-center text-[var(--muted)]">ไม่มี grant</p>
        )}
      </div>
    </div>
  );
}

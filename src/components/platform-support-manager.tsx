"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, KeyRound, LifeBuoy, LogIn } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
} from "@/components/ui";
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

  async function enterTenant(slug: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/platform/support/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug: slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: data.error || "เข้าองค์กรไม่สำเร็จ", tone: "danger" });
        return;
      }
      toast({ title: "เข้าองค์กรแบบ Support แล้ว", tone: "success" });
      window.location.href = data.redirect || `/t/${slug}/videos`;
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/platform/support/${id}`, { method: "PATCH" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start">
      <Card flush className="lg:sticky lg:top-6">
        <CardHeader
          icon={KeyRound}
          title="สร้าง support grant"
          description="ให้สิทธิ์เข้าถึงชั่วคราวแบบมีวันหมดอายุ"
        />
        <CardBody>
          <form onSubmit={createGrant} className="space-y-4">
            <Field label="Tenant slug" required>
              <Input
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="acme"
                className="font-mono"
                required
              />
            </Field>
            <Field label="อีเมลผู้รับสิทธิ์" required>
              <Input
                type="email"
                value={grantedTo}
                onChange={(e) => setGrantedTo(e.target.value)}
                placeholder="support@packex.app"
                required
              />
            </Field>
            <Field label="เหตุผล" required hint="บันทึกไว้ใน audit log">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ตรวจสอบปัญหาการอัปโหลด"
                required
              />
            </Field>
            <Field label="อายุสิทธิ์ (ชั่วโมง)">
              <Input
                type="number"
                min={1}
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(e.target.value)}
              />
            </Field>
            <Button type="submit" className="w-full" loading={busy} icon={KeyRound}>
              {busy ? "กำลังสร้าง…" : "สร้าง grant"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {initial.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="ยังไม่มี support grant"
            description="สร้าง grant เมื่อทีมซัพพอร์ตต้องเข้าดูข้อมูลของ tenant ชั่วคราว"
          />
        ) : (
          initial.map((g) => {
            const expired = new Date(g.expiresAt) < new Date();
            const revoked = !!g.revokedAt;
            const active = !revoked && !expired;
            return (
              <Card key={g.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium text-ink">
                        {g.tenant.slug}
                      </span>
                      <Badge tone={revoked ? "neutral" : expired ? "danger" : "success"} dot>
                        {revoked ? "ยกเลิกแล้ว" : expired ? "หมดอายุ" : "ใช้งานได้"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-ink-2">{g.reason}</p>
                    <p className="mt-1.5 text-xs text-muted">
                      ให้กับ {g.grantedTo} · หมดอายุ{" "}
                      {format(new Date(g.expiresAt), "d MMM yyyy HH:mm", { locale: th })}
                    </p>
                  </div>

                  {active && (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={LogIn}
                        disabled={busy}
                        onClick={() => void enterTenant(g.tenant.slug)}
                      >
                        เข้าองค์กร
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Ban}
                        className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                        onClick={() => void revoke(g.id)}
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type TenantOption = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  targetAll: boolean;
  createdAt: string;
  targets: { id: string; slug: string; name: string }[];
};

export function PlatformAnnouncementsManager({
  announcements: initial,
  tenants,
}: {
  announcements: Announcement[];
  tenants: TenantOption[];
}) {
  const router = useRouter();
  const { confirm, toast } = useNotify();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetAll, setTargetAll] = useState(true);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggleTenant(id: string) {
    setSelectedTenantIds((current) =>
      current.includes(id) ? current.filter((tenantId) => tenantId !== id) : [...current, id],
    );
  }

  async function createAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!targetAll && selectedTenantIds.length === 0) {
      toast({ title: "กรุณาเลือกอย่างน้อย 1 องค์กร", tone: "danger" });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/platform/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          targetAll,
          tenantIds: targetAll ? undefined : selectedTenantIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "สร้างไม่สำเร็จ", tone: "danger" });
        return;
      }
      setTitle("");
      setBody("");
      setTargetAll(true);
      setSelectedTenantIds([]);
      toast({ title: "สร้างประกาศและส่งแจ้งเตือนแล้ว", tone: "success" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/platform/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) router.refresh();
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "ลบประกาศ?",
      description: "การลบจะลบแจ้งเตือนที่เกี่ยวข้องในองค์กรด้วย",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/platform/announcements/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 font-semibold text-[var(--ink)]">สร้างประกาศใหม่</h2>
        <form onSubmit={createAnnouncement} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="หัวข้อประกาศ"
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="เนื้อหาประกาศ"
            required
            rows={3}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
              <input
                type="checkbox"
                checked={targetAll}
                onChange={(e) => setTargetAll(e.target.checked)}
                className="rounded border-[var(--border)]"
              />
              ส่งถึงทุกองค์กร
            </label>

            {!targetAll && (
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {tenants.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">ไม่มีองค์กรให้เลือก</p>
                ) : (
                  tenants.map((tenant) => (
                    <label
                      key={tenant.id}
                      className="flex items-center gap-2 text-sm text-[var(--ink)]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTenantIds.includes(tenant.id)}
                        onChange={() => toggleTenant(tenant.id)}
                        className="rounded border-[var(--border)]"
                      />
                      <span>
                        {tenant.name}{" "}
                        <span className="text-[var(--muted)]">({tenant.slug})</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "กำลังสร้าง…" : "สร้างประกาศ"}
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {initial.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-[var(--ink)]">{a.title}</h2>
                <Badge tone={a.active ? "success" : "neutral"}>
                  {a.active ? "ใช้งาน" : "ปิด"}
                </Badge>
                <Badge tone="info">
                  {a.targetAll
                    ? "ทุกองค์กร"
                    : `${a.targets.length} องค์กร`}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={() => void toggleActive(a.id, a.active)}
                >
                  {a.active ? "ปิด" : "เปิด"}
                </Button>
                <Button variant="danger" className="text-xs" onClick={() => void remove(a.id)}>
                  ลบ
                </Button>
              </div>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{a.body}</p>
            {!a.targetAll && a.targets.length > 0 && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                เป้าหมาย: {a.targets.map((t) => t.name).join(", ")}
              </p>
            )}
            <time className="mt-2 block text-xs text-[var(--muted)]">
              {format(new Date(a.createdAt), "d MMM yyyy", { locale: th })}
            </time>
          </Card>
        ))}
      </div>
    </div>
  );
}

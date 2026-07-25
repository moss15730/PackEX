"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Megaphone, Send, Trash2, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
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
    <div className="grid gap-5 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start">
      <Card flush className="lg:sticky lg:top-6">
        <CardHeader
          icon={Send}
          title="สร้างประกาศใหม่"
          description="ส่งเข้าแจ้งเตือนขององค์กรที่เลือก"
        />
        <CardBody>
          <form onSubmit={createAnnouncement} className="space-y-4">
            <Field label="หัวข้อ" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ปิดปรับปรุงระบบ"
                required
              />
            </Field>

            <Field label="เนื้อหา" required>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="รายละเอียดที่ต้องการแจ้ง"
                required
                rows={4}
              />
            </Field>

            <div className="rounded-xl border border-line bg-subtle/50 p-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={targetAll}
                  onChange={(e) => setTargetAll(e.target.checked)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                ส่งถึงทุกองค์กร
              </label>

              {!targetAll && (
                <div className="mt-3 max-h-52 space-y-1.5 overflow-y-auto">
                  {tenants.length === 0 ? (
                    <p className="text-sm text-muted">ไม่มีองค์กรให้เลือก</p>
                  ) : (
                    tenants.map((tenant) => (
                      <label
                        key={tenant.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink transition hover:bg-surface"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTenantIds.includes(tenant.id)}
                          onChange={() => toggleTenant(tenant.id)}
                          className="h-4 w-4 accent-[var(--brand)]"
                        />
                        <span className="truncate">
                          {tenant.name}{" "}
                          <span className="font-mono text-xs text-muted">({tenant.slug})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" loading={busy} icon={Send}>
              {busy ? "กำลังส่ง…" : "สร้างและส่งประกาศ"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {initial.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="ยังไม่มีประกาศ"
            description="ประกาศที่สร้างจะแสดงที่นี่ พร้อมสถานะการเผยแพร่"
          />
        ) : (
          initial.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-ink">{a.title}</h3>
                    <Badge tone={a.active ? "success" : "neutral"} dot>
                      {a.active ? "เผยแพร่อยู่" : "ปิดอยู่"}
                    </Badge>
                    <Badge tone="info" icon={Users}>
                      {a.targetAll ? "ทุกองค์กร" : `${a.targets.length} องค์กร`}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{a.body}</p>
                  {!a.targetAll && a.targets.length > 0 && (
                    <p className="mt-2 text-xs text-faint">
                      เป้าหมาย: {a.targets.map((t) => t.name).join(", ")}
                    </p>
                  )}
                  <time className="mt-2 block text-xs text-faint">
                    {format(new Date(a.createdAt), "d MMM yyyy", { locale: th })}
                  </time>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={a.active ? EyeOff : Eye}
                    onClick={() => void toggleActive(a.id, a.active)}
                  >
                    {a.active ? "ปิด" : "เปิด"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                    onClick={() => void remove(a.id)}
                  >
                    ลบ
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

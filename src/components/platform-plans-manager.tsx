"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { useNotify } from "@/components/notify";

type Plan = {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  maxStations: number;
  maxStorageGb: number;
  retentionDays: number;
  maxUsers: number;
  allowIpCamera: boolean;
  allowMultiCam: boolean;
  allowShareLink: boolean;
  allowIntegrations: boolean;
  allowAi: boolean;
  allowSso: boolean;
  allowCustomDomain: boolean;
  priceMonthly: number;
  trialDays: number;
};

function parseNum(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function PlatformPlansManager({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const { confirm, alert, toast } = useNotify();

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingPlan = useMemo(
    () => (editingId ? plans.find((p) => p.id === editingId) ?? null : null),
    [editingId, plans],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [maxStations, setMaxStations] = useState("0");
  const [maxStorageGb, setMaxStorageGb] = useState("0");
  const [retentionDays, setRetentionDays] = useState("0");
  const [maxUsers, setMaxUsers] = useState("0");
  const [priceMonthly, setPriceMonthly] = useState("0");
  const [trialDays, setTrialDays] = useState("0");

  const [allowIpCamera, setAllowIpCamera] = useState(false);
  const [allowMultiCam, setAllowMultiCam] = useState(false);
  const [allowShareLink, setAllowShareLink] = useState(false);
  const [allowIntegrations, setAllowIntegrations] = useState(false);
  const [allowAi, setAllowAi] = useState(false);
  const [allowSso, setAllowSso] = useState(false);
  const [allowCustomDomain, setAllowCustomDomain] = useState(false);

  function resetForm() {
    setMode("create");
    setEditingId(null);
    setError(null);
    setCode("");
    setNameTh("");
    setNameEn("");
    setMaxStations("0");
    setMaxStorageGb("0");
    setRetentionDays("0");
    setMaxUsers("0");
    setPriceMonthly("0");
    setTrialDays("0");
    setAllowIpCamera(false);
    setAllowMultiCam(false);
    setAllowShareLink(false);
    setAllowIntegrations(false);
    setAllowAi(false);
    setAllowSso(false);
    setAllowCustomDomain(false);
  }

  function loadFromPlan(p: Plan) {
    setMode("edit");
    setEditingId(p.id);
    setError(null);
    setCode(p.code);
    setNameTh(p.nameTh);
    setNameEn(p.nameEn);
    setMaxStations(String(p.maxStations));
    setMaxStorageGb(String(p.maxStorageGb));
    setRetentionDays(String(p.retentionDays));
    setMaxUsers(String(p.maxUsers));
    setPriceMonthly(String(p.priceMonthly));
    setTrialDays(String(p.trialDays));
    setAllowIpCamera(p.allowIpCamera);
    setAllowMultiCam(p.allowMultiCam);
    setAllowShareLink(p.allowShareLink);
    setAllowIntegrations(p.allowIntegrations);
    setAllowAi(p.allowAi);
    setAllowSso(p.allowSso);
    setAllowCustomDomain(p.allowCustomDomain);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        code: code.trim(),
        nameTh: nameTh.trim(),
        nameEn: nameEn.trim(),
        maxStations: parseNum(maxStations),
        maxStorageGb: parseNum(maxStorageGb),
        retentionDays: parseNum(retentionDays),
        maxUsers: parseNum(maxUsers),
        allowIpCamera,
        allowMultiCam,
        allowShareLink,
        allowIntegrations,
        allowAi,
        allowSso,
        allowCustomDomain,
        priceMonthly: parseNum(priceMonthly),
        trialDays: parseNum(trialDays),
      };

      const res = await fetch(
        mode === "create"
          ? "/api/platform/plans"
          : `/api/platform/plans/${editingId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "บันทึกไม่สำเร็จ");
        return;
      }

      toast({
        title: mode === "create" ? "สร้างแผนแล้ว" : "แก้ไขแผนแล้ว",
        description: payload.code,
        tone: "success",
      });
      resetForm();
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setError(message);
      await alert({ title: "บันทึกไม่สำเร็จ", description: message, tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(p: Plan) {
    const ok = await confirm({
      title: `ลบแพ็กเกจ «${p.nameTh}»?`,
      description: "ถ้ามีการใช้งานใน subscription อยู่ ระบบจะไม่ให้ลบ",
      confirmLabel: "ลบ",
      cancelLabel: "ยกเลิก",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/platform/plans/${p.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ลบไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      toast({ title: "ลบแผนแล้ว", description: p.code, tone: "success" });
      if (mode === "edit" && editingId === p.id) resetForm();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-[var(--ink)]">
              {mode === "create" ? "สร้าง/เพิ่มแพ็กเกจ" : "แก้ไขแพ็กเกจ"}
            </h2>
            {mode === "edit" && editingPlan ? (
              <div className="mt-1 text-xs text-[var(--muted)]">
                Editing: <span className="font-mono">{editingPlan.code}</span>
              </div>
            ) : null}
          </div>
          {mode === "edit" ? (
            <Button type="button" variant="secondary" className="min-h-11" onClick={resetForm} disabled={busy}>
              ยกเลิกแก้ไข
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Code
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="starter | business | enterprise"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                ราคา/เดือน (THB)
              </label>
              <input
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                ชื่อ (TH)
              </label>
              <input
                value={nameTh}
                onChange={(e) => setNameTh(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Starter"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                ชื่อ (EN)
              </label>
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Starter"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                maxStations
              </label>
              <input
                value={maxStations}
                onChange={(e) => setMaxStations(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                maxStorageGb
              </label>
              <input
                value={maxStorageGb}
                onChange={(e) => setMaxStorageGb(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                maxUsers
              </label>
              <input
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                inputMode="numeric"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                retentionDays
              </label>
              <input
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                trialDays
              </label>
              <input
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { label: "IP Camera", checked: allowIpCamera, onChange: setAllowIpCamera },
                { label: "Multi Cam", checked: allowMultiCam, onChange: setAllowMultiCam },
                { label: "Share Link", checked: allowShareLink, onChange: setAllowShareLink },
                {
                  label: "Integrations",
                  checked: allowIntegrations,
                  onChange: setAllowIntegrations,
                },
                { label: "AI", checked: allowAi, onChange: setAllowAi },
                { label: "SSO", checked: allowSso, onChange: setAllowSso },
                {
                  label: "Custom Domain",
                  checked: allowCustomDomain,
                  onChange: setAllowCustomDomain,
                },
              ] as const
            ).map((c) => (
              <label
                key={c.label}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={c.checked}
                  onChange={(e) => c.onChange(e.target.checked)}
                />
                <span className="text-[var(--muted)]">{c.label}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={busy} className="min-h-11 px-6">
              {busy ? "กำลังบันทึก..." : mode === "create" ? "สร้างแพ็กเกจ" : "บันทึกการแก้ไข"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              className="min-h-11 px-6"
              onClick={resetForm}
            >
              ล้างฟอร์ม
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-[var(--ink)]">{p.nameTh}</div>
                <div className="mt-1 text-xs text-[var(--muted)] font-mono">{p.code}</div>
              </div>
              <Badge tone={p.trialDays > 0 ? "info" : "neutral"}>{p.trialDays > 0 ? `Trial ${p.trialDays}d` : "Paid"}</Badge>
            </div>
            <div className="mt-3 text-2xl font-bold">
              {p.priceMonthly > 0 ? `฿${p.priceMonthly.toLocaleString()}/เดือน` : "ติดต่อเรา"}
            </div>
            <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
              <li>สถานี: {p.maxStations}</li>
              <li>พื้นที่: {p.maxStorageGb} GB</li>
              <li>ผู้ใช้: {p.maxUsers}</li>
              <li>Retention: {p.retentionDays} วัน</li>
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="flex-1 min-h-11" disabled={busy} onClick={() => loadFromPlan(p)}>
                แก้ไข
              </Button>
              <Button type="button" variant="outline" className="flex-1 min-h-11 text-rose-600 hover:text-rose-700" disabled={busy} onClick={() => void handleDelete(p)}>
                ลบ
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


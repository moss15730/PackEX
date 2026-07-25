"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Package, Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  Input,
} from "@/components/ui";
import { useNotify } from "@/components/notify";

type PlanSubscription = {
  slug: string;
  name: string;
  status: string;
};

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
  subscriptions?: PlanSubscription[];
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
      description: "ถ้ามีองค์กรใช้แผนนี้อยู่ ระบบจะไม่ให้ลบ — ไปเปลี่ยนแผนที่หน้า Tenants ก่อน",
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

  const FEATURE_TOGGLES = [
    { label: "IP Camera", checked: allowIpCamera, onChange: setAllowIpCamera },
    { label: "Multi Cam", checked: allowMultiCam, onChange: setAllowMultiCam },
    { label: "Share Link", checked: allowShareLink, onChange: setAllowShareLink },
    { label: "Integrations", checked: allowIntegrations, onChange: setAllowIntegrations },
    { label: "AI", checked: allowAi, onChange: setAllowAi },
    { label: "SSO", checked: allowSso, onChange: setAllowSso },
    { label: "Custom Domain", checked: allowCustomDomain, onChange: setAllowCustomDomain },
  ] as const;

  return (
    <div className="space-y-6">
      <Card flush>
        <CardHeader
          icon={Package}
          title={mode === "create" ? "สร้างแพ็กเกจใหม่" : `แก้ไขแพ็กเกจ ${editingPlan?.code ?? ""}`}
          description="กำหนดโควต้าและฟีเจอร์ที่เปิดให้ใช้ในแต่ละแผน"
          actions={
            mode === "edit" ? (
              <Button type="button" variant="secondary" size="sm" onClick={resetForm} disabled={busy}>
                ยกเลิกแก้ไข
              </Button>
            ) : null
          }
        />
        <CardBody className="space-y-5">
          {error ? (
            <Callout tone="danger" icon={AlertTriangle}>
              {error}
            </Callout>
          ) : null}

          <form id="plan-form" onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code" required hint="ตัวระบุแผนในระบบ">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="starter | business | enterprise"
                  className="font-mono"
                  required
                />
              </Field>
              <Field label="ราคาต่อเดือน (THB)">
                <Input
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(e.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <Field label="ชื่อแผน (ไทย)" required>
                <Input
                  value={nameTh}
                  onChange={(e) => setNameTh(e.target.value)}
                  placeholder="สตาร์ทเตอร์"
                  required
                />
              </Field>
              <Field label="ชื่อแผน (English)" required>
                <Input
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Starter"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="จำนวนสถานีสูงสุด" required>
                <Input
                  value={maxStations}
                  onChange={(e) => setMaxStations(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </Field>
              <Field label="พื้นที่จัดเก็บ (GB)" required>
                <Input
                  value={maxStorageGb}
                  onChange={(e) => setMaxStorageGb(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </Field>
              <Field label="ผู้ใช้สูงสุด" required>
                <Input
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </Field>
              <Field label="เก็บข้อมูล (วัน)" required>
                <Input
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </Field>
              <Field label="ทดลองใช้ (วัน)">
                <Input
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  inputMode="numeric"
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink">ฟีเจอร์ที่เปิดใช้</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURE_TOGGLES.map((c) => (
                  <label
                    key={c.label}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-2 transition hover:bg-subtle has-checked:border-brand-border has-checked:bg-brand-soft/60 has-checked:text-ink"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--brand)]"
                      checked={c.checked}
                      onChange={(e) => c.onChange(e.target.checked)}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          </form>
        </CardBody>
        <CardFooter>
          <Button type="button" variant="secondary" disabled={busy} onClick={resetForm}>
            ล้างฟอร์ม
          </Button>
          <Button type="submit" form="plan-form" loading={busy}>
            {mode === "create" ? "สร้างแพ็กเกจ" : "บันทึกการแก้ไข"}
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold tracking-tight text-ink">
                  {p.nameTh}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-muted">{p.code}</p>
              </div>
              <Badge tone={p.trialDays > 0 ? "info" : "neutral"}>
                {p.trialDays > 0 ? `ทดลอง ${p.trialDays} วัน` : "Paid"}
              </Badge>
            </div>

            <p className="tabular mt-4 text-2xl font-semibold tracking-tight text-ink">
              {p.priceMonthly > 0 ? (
                <>
                  ฿{p.priceMonthly.toLocaleString()}
                  <span className="text-base font-normal text-muted">/เดือน</span>
                </>
              ) : (
                "ติดต่อเรา"
              )}
            </p>

            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[13px]">
              {[
                { k: "สถานี", v: p.maxStations },
                { k: "พื้นที่", v: `${p.maxStorageGb} GB` },
                { k: "ผู้ใช้", v: p.maxUsers },
                { k: "Retention", v: `${p.retentionDays} วัน` },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between gap-3">
                  <dt className="text-muted">{row.k}</dt>
                  <dd className="tabular font-medium text-ink">{row.v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-xs text-muted">
              {p.subscriptions && p.subscriptions.length > 0 ? (
                <>
                  ใช้งานโดย{" "}
                  <span className="font-mono text-ink-2">
                    {p.subscriptions.map((s) => s.slug).join(", ")}
                  </span>
                </>
              ) : (
                "ยังไม่มีองค์กรใช้แผนนี้"
              )}
            </p>

            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Pencil}
                className="flex-1"
                disabled={busy}
                onClick={() => loadFromPlan(p)}
              >
                แก้ไข
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Trash2}
                className="flex-1 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                disabled={busy}
                onClick={() => void handleDelete(p)}
              >
                ลบ
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


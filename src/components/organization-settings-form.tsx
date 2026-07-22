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

type RecordingPolicy = {
  overlayEnabled: boolean;
  snapshotRequired: boolean;
  minRecordingSeconds: number;
  minCameras: number;
  idleAutoStopMinutes: number;
  softDeleteDays: number;
  videoPreset: string;
  consentRequired: boolean;
};

export function OrganizationSettingsForm({
  tenant,
  tenantSlug,
  policy,
}: {
  tenant: TenantInfo;
  tenantSlug: string;
  policy: RecordingPolicy;
}) {
  const router = useRouter();
  const { toast } = useNotify();
  const [name, setName] = useState(tenant.name);
  const [locale, setLocale] = useState(tenant.locale);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [overlayEnabled, setOverlayEnabled] = useState(policy.overlayEnabled);
  const [snapshotRequired, setSnapshotRequired] = useState(policy.snapshotRequired);
  const [minRecordingSeconds, setMinRecordingSeconds] = useState(
    String(policy.minRecordingSeconds),
  );
  const [minCameras, setMinCameras] = useState(String(policy.minCameras));
  const [idleAutoStopMinutes, setIdleAutoStopMinutes] = useState(
    String(policy.idleAutoStopMinutes),
  );
  const [softDeleteDays, setSoftDeleteDays] = useState(String(policy.softDeleteDays));
  const [videoPreset, setVideoPreset] = useState(policy.videoPreset);
  const [consentRequired, setConsentRequired] = useState(policy.consentRequired);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/organization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          locale,
          timezone,
          overlayEnabled,
          snapshotRequired,
          minRecordingSeconds: Number(minRecordingSeconds),
          minCameras: Number(minCameras),
          idleAutoStopMinutes: Number(idleAutoStopMinutes),
          softDeleteDays: Number(softDeleteDays),
          videoPreset,
          consentRequired,
        }),
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
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="font-semibold text-[var(--ink)]">ข้อมูลทั่วไป</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">ชื่อ ภาษา และโซนเวลาขององค์กร</p>
          </div>

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
          <div className="grid gap-4 sm:grid-cols-2">
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
              <p className="mt-1 text-xs text-[var(--muted)]">
                เก็บค่าไว้ในระบบ — UI ยังเป็นภาษาไทยเป็นหลัก
              </p>
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
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">สถานะ</span>
            <span className="font-medium">{statusLabel(tenant.status)}</span>
          </div>

          <div className="border-t border-[var(--border)] pt-5">
            <h2 className="font-semibold text-[var(--ink)]">นโยบายการอัด / หลักฐาน</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              มีผลกับ Station Console, completeness score และช่วงกู้คืนวิดีโอ
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
            <input
              type="checkbox"
              checked={overlayEnabled}
              onChange={(e) => setOverlayEnabled(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--ink)]">Burn-in overlay</span>
              <span className="text-xs text-[var(--muted)]">
                ใส่เลขออเดอร์ / สถานี / พนักงาน / เวลาลงในไฟล์วิดีโอและ snapshot
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
            <input
              type="checkbox"
              checked={snapshotRequired}
              onChange={(e) => setSnapshotRequired(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--ink)]">บังคับ snapshot ก่อนจบ</span>
              <span className="text-xs text-[var(--muted)]">
                ถ้าไม่มี snapshot คะแนนครบถ้วนจะลดลง
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
            <input
              type="checkbox"
              checked={consentRequired}
              onChange={(e) => setConsentRequired(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--ink)]">ต้องมี consent พนักงาน</span>
              <span className="text-xs text-[var(--muted)]">
                นโยบายบันทึกภาพตอนทำงาน (เก็บค่าสำหรับ flow consent ในอนาคต)
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">
                ความยาวขั้นต่ำ (วินาที)
              </label>
              <input
                type="number"
                min={5}
                max={600}
                value={minRecordingSeconds}
                onChange={(e) => setMinRecordingSeconds(e.target.value)}
                required
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">
                จำนวนกล้องขั้นต่ำ
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={minCameras}
                onChange={(e) => setMinCameras(e.target.value)}
                required
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">
                Auto-stop เมื่อ idle (นาที)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={idleAutoStopMinutes}
                onChange={(e) => setIdleAutoStopMinutes(e.target.value)}
                required
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">
                ช่วงกู้คืนหลังลบ (วัน)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={softDeleteDays}
                onChange={(e) => setSoftDeleteDays(e.target.value)}
                required
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">
              คุณภาพวิดีโอ (preset)
            </label>
            <select
              value={videoPreset}
              onChange={(e) => setVideoPreset(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
            >
              <option value="economy">Economy — ประหยัดพื้นที่</option>
              <option value="standard">Standard — ค่าเริ่มต้น</option>
              <option value="high">High — คมชัดขึ้น</option>
            </select>
          </div>

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

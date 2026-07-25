"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Field,
  Input,
  Select,
} from "@/components/ui";
import { useNotify } from "@/components/notify";
import { statusLabel, statusTone } from "@/lib/utils";

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
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5">
      {/* General */}
      <Card flush>
        <CardHeader
          icon={Building2}
          title="ข้อมูลทั่วไป"
          description="ชื่อ ภาษา และโซนเวลาขององค์กร"
          actions={<Badge tone={statusTone(tenant.status)} dot>{statusLabel(tenant.status)}</Badge>}
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อองค์กร" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Slug" hint="ใช้เป็น URL ขององค์กร — แก้ไขไม่ได้">
              <Input value={tenant.slug} disabled className="font-mono" />
            </Field>
            <Field label="ภาษา" hint="เก็บค่าไว้ในระบบ — UI ยังเป็นภาษาไทยเป็นหลัก">
              <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
                <option value="th">ไทย</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
              </Select>
            </Field>
            <Field label="โซนเวลา" hint="ใช้กับเวลาที่แสดงบนวิดีโอ">
              <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                <option value="UTC">UTC</option>
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Recording policy */}
      <Card flush>
        <CardHeader
          icon={ShieldCheck}
          title="นโยบายการอัดและหลักฐาน"
          description="มีผลกับ Station Console, คะแนนความครบถ้วน และช่วงกู้คืนวิดีโอ"
        />
        <CardBody className="space-y-5">
          <div className="space-y-3">
            <Checkbox
              checked={overlayEnabled}
              onChange={(e) => setOverlayEnabled(e.target.checked)}
              label="Burn-in overlay"
              description="ใส่เลขออเดอร์ / สถานี / พนักงาน / เวลาลงในไฟล์วิดีโอและ snapshot"
            />
            <Checkbox
              checked={snapshotRequired}
              onChange={(e) => setSnapshotRequired(e.target.checked)}
              label="บังคับ snapshot ก่อนจบงาน"
              description="ถ้าไม่มี snapshot คะแนนความครบถ้วนจะลดลง"
            />
            <Checkbox
              checked={consentRequired}
              onChange={(e) => setConsentRequired(e.target.checked)}
              label="ต้องมี consent จากพนักงาน"
              description="นโยบายบันทึกภาพตอนทำงาน (เก็บค่าสำหรับ flow consent ในอนาคต)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ความยาวขั้นต่ำ (วินาที)">
              <Input
                type="number"
                min={5}
                max={600}
                value={minRecordingSeconds}
                onChange={(e) => setMinRecordingSeconds(e.target.value)}
                required
              />
            </Field>
            <Field label="จำนวนกล้องขั้นต่ำ">
              <Input
                type="number"
                min={1}
                max={8}
                value={minCameras}
                onChange={(e) => setMinCameras(e.target.value)}
                required
              />
            </Field>
            <Field label="หยุดอัตโนมัติเมื่อไม่มีการใช้งาน (นาที)">
              <Input
                type="number"
                min={1}
                max={120}
                value={idleAutoStopMinutes}
                onChange={(e) => setIdleAutoStopMinutes(e.target.value)}
                required
              />
            </Field>
            <Field label="ช่วงกู้คืนหลังลบ (วัน)">
              <Input
                type="number"
                min={1}
                max={365}
                value={softDeleteDays}
                onChange={(e) => setSoftDeleteDays(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="คุณภาพวิดีโอ" hint="คุณภาพสูงขึ้นใช้พื้นที่จัดเก็บมากขึ้น">
            <Select value={videoPreset} onChange={(e) => setVideoPreset(e.target.value)}>
              <option value="economy">Economy — ประหยัดพื้นที่</option>
              <option value="standard">Standard — ค่าเริ่มต้น</option>
              <option value="high">High — คมชัดขึ้น</option>
            </Select>
          </Field>
        </CardBody>
        <CardFooter>
          <Button type="submit" loading={loading}>
            {loading ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

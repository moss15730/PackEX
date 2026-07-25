"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Save, UserPlus } from "lucide-react";
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { Switch } from "@/components/ui-client";
import { useNotify } from "@/components/notify";
import type { TrialPolicy } from "@/lib/platform-settings";

export type PlanOption = { id: string; nameTh: string; maxStations: number; maxStorageGb: number; maxUsers: number };

export function PlatformSettingsForm({
  initial,
  plans,
  canManage,
}: {
  initial: TrialPolicy;
  plans: PlanOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { alert, toast } = useNotify();

  const [signupEnabled, setSignupEnabled] = useState(initial.signupEnabled);
  const [trialPlanId, setTrialPlanId] = useState(initial.trialPlanId ?? "");
  const [trialDays, setTrialDays] = useState(String(initial.trialDays));
  const [maxStations, setMaxStations] = useState(initial.trialMaxStations?.toString() ?? "");
  const [maxStorageGb, setMaxStorageGb] = useState(initial.trialMaxStorageGb?.toString() ?? "");
  const [maxUsers, setMaxUsers] = useState(initial.trialMaxUsers?.toString() ?? "");
  const [trialNotice, setTrialNotice] = useState(initial.trialNotice ?? "");
  const [busy, setBusy] = useState(false);

  const selectedPlan = plans.find((p) => p.id === trialPlanId) ?? plans[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/platform/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupEnabled,
          trialPlanId: trialPlanId || null,
          trialDays: Number(trialDays),
          trialMaxStations: maxStations === "" ? null : Number(maxStations),
          trialMaxStorageGb: maxStorageGb === "" ? null : Number(maxStorageGb),
          trialMaxUsers: maxUsers === "" ? null : Number(maxUsers),
          trialNotice,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "บันทึกไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด",
          tone: "danger",
        });
        return;
      }
      toast({ title: "บันทึกการตั้งค่าแล้ว", tone: "success" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      <Card flush>
        <CardHeader
          icon={UserPlus}
          title="การสมัครทดลองใช้ด้วยตนเอง"
          description="เปิดให้องค์กรสร้างบัญชีเองจากหน้า /signup"
        />
        <CardBody>
          <Switch
            checked={signupEnabled}
            onChange={setSignupEnabled}
            label="เปิดรับสมัครทดลองใช้"
            description={
              signupEnabled
                ? "องค์กรใหม่สร้างบัญชีเองได้ทันทีโดยไม่ต้องรออนุมัติ"
                : "ปิดอยู่ — หน้า /signup จะแจ้งให้ติดต่อทีมงานแทน"
            }
          />
        </CardBody>
      </Card>

      <Card flush>
        <CardHeader
          icon={Clock}
          title="ขอบเขตการทดลองใช้"
          description="ค่าที่กำหนดที่นี่จะถูกใช้กับทุกองค์กรที่สมัครใหม่"
        />
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="แผนที่ใช้ตอนทดลอง" hint="ถ้าไม่เลือกจะใช้แผนที่ราคาถูกที่สุด">
              <Select value={trialPlanId} onChange={(e) => setTrialPlanId(e.target.value)}>
                <option value="">เลือกอัตโนมัติ (ถูกที่สุด)</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nameTh}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="จำนวนวันทดลองใช้" required hint="1–365 วัน">
              <Input
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                required
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink">โควต้าระหว่างทดลองใช้</p>
            <p className="mb-3 text-xs leading-relaxed text-muted">
              เว้นว่าง = ใช้ตามแผนที่เลือก
              {selectedPlan
                ? ` (แผน ${selectedPlan.nameTh}: ${selectedPlan.maxStations} สถานี · ${selectedPlan.maxStorageGb} GB · ${selectedPlan.maxUsers} ผู้ใช้)`
                : ""}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="สถานีสูงสุด">
                <Input
                  type="number"
                  min={1}
                  value={maxStations}
                  onChange={(e) => setMaxStations(e.target.value)}
                  placeholder="ตามแผน"
                />
              </Field>
              <Field label="พื้นที่วิดีโอ (GB)">
                <Input
                  type="number"
                  min={1}
                  value={maxStorageGb}
                  onChange={(e) => setMaxStorageGb(e.target.value)}
                  placeholder="ตามแผน"
                />
              </Field>
              <Field label="ผู้ใช้สูงสุด">
                <Input
                  type="number"
                  min={1}
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value)}
                  placeholder="ตามแผน"
                />
              </Field>
            </div>
          </div>

          <Field
            label="ข้อความแจ้งผู้สมัคร"
            hint="แสดงบนหน้าสมัครและในข้อความต้อนรับในแชท"
          >
            <Textarea
              value={trialNotice}
              onChange={(e) => setTrialNotice(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="เช่น ต้องการต่ออายุหรือเพิ่มความจุ ทักแชทหาทีมงานได้ตลอด"
            />
          </Field>

          <Callout tone="info">
            เมื่อครบกำหนด องค์กรยัง<strong>เข้าสู่ระบบและดูข้อมูลได้ทั้งหมด</strong>{" "}
            แต่จะเพิ่ม แก้ไข หรือลบไม่ได้ จนกว่าจะต่ออายุหรือเปลี่ยนแผนให้
          </Callout>
        </CardBody>
        <CardFooter>
          <Button type="submit" icon={Save} loading={busy} disabled={!canManage}>
            บันทึกการตั้งค่า
          </Button>
        </CardFooter>
      </Card>

      {!canManage ? (
        <Callout tone="warning">เฉพาะบัญชี super admin เท่านั้นที่แก้ไขการตั้งค่านี้ได้</Callout>
      ) : null}
    </form>
  );
}

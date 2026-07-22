import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { ensureOnboardingState, refreshOnboardingState } from "@/lib/onboarding";
import { PageHeader, Card, Button } from "@/components/ui";

const STEPS = [
  { key: "stationCreated", label: "สร้างสถานีแพ็ค", href: "settings/stations" },
  { key: "cameraTested", label: "ทดสอบกล้อง", href: "station" },
  { key: "employeesInvited", label: "เชิญพนักงาน", href: "settings/employees" },
  { key: "localeSet", label: "ตั้งค่าภาษา/โซนเวลา", href: "settings/organization" },
  { key: "testClipDone", label: "อัดคลิปทดสอบ", href: "station" },
] as const;

export default async function OnboardingPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  await ensureOnboardingState(session.tenantId);
  const onboarding = await refreshOnboardingState(session.tenantId);

  const done = STEPS.filter((s) => onboarding[s.key]).length;
  const total = STEPS.length;

  return (
    <div>
      <PageHeader
        title="เริ่มต้นใช้งาน"
        description={`ทำครบ ${done}/${total} ขั้นตอน`}
      />

      {onboarding.completed ? (
        <Card className="text-center">
          <p className="text-lg font-semibold text-[var(--ink)]">พร้อมใช้งานแล้ว!</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            คุณทำ onboarding ครบแล้ว ไปที่ Station Console เพื่อเริ่มแพ็ค
          </p>
          <Link href={`/t/${session.tenantSlug}/station`} className="mt-4 inline-block">
            <Button variant="primary">เปิด Station Console</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const complete = onboarding[step.key];
            return (
              <Card key={step.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      complete
                        ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                        : "bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {complete ? "✓" : i + 1}
                  </span>
                  <span className={complete ? "text-[var(--muted)] line-through" : "text-[var(--ink)]"}>
                    {step.label}
                  </span>
                </div>
                {!complete && (
                  <Link href={`/t/${session.tenantSlug}/${step.href}`}>
                    <Button variant="outline" className="text-xs">
                      ทำเลย
                    </Button>
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

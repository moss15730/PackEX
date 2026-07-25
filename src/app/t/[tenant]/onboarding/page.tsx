import { ArrowRight, Check, PartyPopper } from "lucide-react";
import { requireTenantSession } from "@/lib/auth";
import { ensureOnboardingState, refreshOnboardingState } from "@/lib/onboarding";
import { ButtonLink, Card, PageHeader, Progress } from "@/components/ui";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "stationCreated",
    label: "สร้างสถานีแพ็ค",
    hint: "กำหนดรหัสสถานีและตำแหน่งกล้องในคลัง",
    href: "settings/stations",
  },
  {
    key: "cameraTested",
    label: "ทดสอบกล้อง",
    hint: "ตรวจว่ากล้องทุกมุมเชื่อมต่อและเห็นภาพชัด",
    href: "station",
  },
  {
    key: "employeesInvited",
    label: "เชิญพนักงาน",
    hint: "เพิ่มบัญชีผู้แพ็คและกำหนดสิทธิ์การใช้งาน",
    href: "settings/employees",
  },
  {
    key: "localeSet",
    label: "ตั้งค่าภาษาและโซนเวลา",
    hint: "ให้เวลาบนวิดีโอตรงกับเวลาจริงของคลัง",
    href: "settings/organization",
  },
  {
    key: "testClipDone",
    label: "อัดคลิปทดสอบ",
    hint: "ลองอัดหนึ่งออเดอร์เพื่อยืนยันว่าระบบพร้อม",
    href: "station",
  },
] as const;

export default async function OnboardingPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  await ensureOnboardingState(session.tenantId);
  const onboarding = await refreshOnboardingState(session.tenantId);

  const done = STEPS.filter((s) => onboarding[s.key]).length;
  const total = STEPS.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="เริ่มต้นใช้งาน"
        title="ตั้งค่า PackEX ให้พร้อมใช้"
        description="ทำครบทุกขั้นตอนเพื่อให้ทีมคลังเริ่มบันทึกหลักฐานการแพ็คได้ทันที"
      />

      {onboarding.completed ? (
        <Card className="p-8 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-ink">
            <PartyPopper size={24} strokeWidth={1.9} />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink">พร้อมใช้งานแล้ว</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            คุณตั้งค่าครบทุกขั้นตอนแล้ว เปิด Station Console เพื่อเริ่มบันทึกการแพ็คได้เลย
          </p>
          <ButtonLink
            href={`/t/${session.tenantSlug}/station`}
            variant="primary"
            size="lg"
            iconRight={ArrowRight}
            className="mt-6"
          >
            เปิด Station Console
          </ButtonLink>
        </Card>
      ) : (
        <>
          <Card className="mb-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-muted">ความคืบหน้า</p>
                <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">
                  {done}
                  <span className="text-muted">/{total} ขั้นตอน</span>
                </p>
              </div>
              <span className="tabular text-sm font-medium text-brand">{pct}%</span>
            </div>
            <Progress className="mt-4 h-2" value={done} max={total} />
          </Card>

          <ol className="space-y-3">
            {STEPS.map((step, i) => {
              const complete = onboarding[step.key];
              return (
                <li
                  key={step.key}
                  className={cn(
                    "flex flex-wrap items-center gap-4 rounded-xl border bg-surface p-4 shadow-sm sm:p-5",
                    complete ? "border-line" : "border-line-strong",
                  )}
                >
                  <span
                    className={cn(
                      "tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      complete
                        ? "bg-brand text-brand-ink"
                        : "bg-subtle text-muted ring-1 ring-line",
                    )}
                  >
                    {complete ? <Check size={16} strokeWidth={2.6} /> : i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        complete ? "text-muted line-through" : "text-ink",
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">{step.hint}</p>
                  </div>

                  {!complete && (
                    <ButtonLink
                      href={`/t/${session.tenantSlug}/${step.href}`}
                      variant="secondary"
                      size="sm"
                      iconRight={ArrowRight}
                    >
                      ทำเลย
                    </ButtonLink>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, Camera, Clock, HardDrive, Users } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { ButtonLink, Callout } from "@/components/ui";
import { SignupForm } from "@/components/signup-form";
import { getPlatformSettings, resolveTrialPlan } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "สมัครทดลองใช้",
  description: "สร้างองค์กรของคุณบน PackEX และเริ่มทดลองใช้ได้ทันที",
};

export default async function SignupPage() {
  const policy = await getPlatformSettings();
  const plan = await resolveTrialPlan(policy);

  const scope = {
    days: policy.trialDays,
    planName: plan?.nameTh ?? "—",
    stations: policy.trialMaxStations ?? plan?.maxStations ?? null,
    storageGb: policy.trialMaxStorageGb ?? plan?.maxStorageGb ?? null,
    users: policy.trialMaxUsers ?? plan?.maxUsers ?? null,
  };

  return (
    <div className="aurora flex min-h-[100dvh] flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
        <Link href="/">
          <PackExWordmark />
        </Link>
        <ButtonLink href="/login" variant="ghost" size="sm">
          มีบัญชีแล้ว? เข้าสู่ระบบ
        </ButtonLink>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            สร้างองค์กรและเริ่มทดลองใช้
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
            กรอกข้อมูลด้านล่างเพื่อสร้างพื้นที่ขององค์กรคุณ ใช้งานได้ทันทีโดยไม่ต้องรอการอนุมัติ
          </p>

          {!policy.signupEnabled ? (
            <Callout tone="warning" title="ปิดรับสมัครชั่วคราว" className="mt-6">
              ขณะนี้ระบบปิดรับสมัครทดลองใช้แบบสร้างเอง กรุณาติดต่อทีมงานเพื่อขอเปิดใช้งาน
            </Callout>
          ) : (
            <div className="mt-8">
              <SignupForm />
            </div>
          )}
        </div>

        <aside className="lg:pt-16">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
              ขอบเขตการทดลองใช้
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-ink">
              แผน {scope.planName}
            </p>

            <dl className="mt-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-ink">
                  <Clock size={16} />
                </span>
                <div>
                  <dt className="text-xs text-muted">ระยะเวลา</dt>
                  <dd className="tabular text-sm font-medium text-ink">{scope.days} วัน</dd>
                </div>
              </div>

              {scope.stations != null ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-muted">
                    <Camera size={16} />
                  </span>
                  <div>
                    <dt className="text-xs text-muted">สถานีแพ็ค</dt>
                    <dd className="tabular text-sm font-medium text-ink">{scope.stations} สถานี</dd>
                  </div>
                </div>
              ) : null}

              {scope.storageGb != null ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-muted">
                    <HardDrive size={16} />
                  </span>
                  <div>
                    <dt className="text-xs text-muted">พื้นที่วิดีโอ</dt>
                    <dd className="tabular text-sm font-medium text-ink">{scope.storageGb} GB</dd>
                  </div>
                </div>
              ) : null}

              {scope.users != null ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-muted">
                    <Users size={16} />
                  </span>
                  <div>
                    <dt className="text-xs text-muted">ผู้ใช้</dt>
                    <dd className="tabular text-sm font-medium text-ink">{scope.users} คน</dd>
                  </div>
                </div>
              ) : null}
            </dl>

            <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted">
              {policy.trialNotice ??
                "เมื่อครบกำหนด ยังเข้าสู่ระบบและดูข้อมูลเดิมได้ทั้งหมด แต่จะเพิ่ม แก้ไข หรือลบไม่ได้ จนกว่าจะติดต่อผู้ดูแลระบบผ่านแชทในแอป"}
            </p>
          </div>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
          >
            <ArrowLeft size={14} />
            กลับหน้าแรก
          </Link>
        </aside>
      </main>
    </div>
  );
}

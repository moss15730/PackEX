import { ArrowLeft, LifeBuoy, PauseCircle } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

export const metadata = { title: "บัญชีถูกระงับ" };

export default function SuspendedPage() {
  return (
    <div className="aurora flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <PackExWordmark />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-7 text-center shadow-lg sm:p-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning-ink">
            <PauseCircle size={26} strokeWidth={1.9} />
          </span>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">บัญชีถูกระงับ</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            องค์กรของคุณถูกระงับการใช้งานชั่วคราว มักเกิดจากการค้างชำระหรือเกินขีดจำกัดแพ็กเกจ
            กรุณาชำระเงินหรือติดต่อผู้ดูแล billing เพื่อเปิดใช้งานต่อ
          </p>

          <div className="mt-7 flex flex-col gap-2">
            <ButtonLink href="mailto:billing@packex.app" variant="primary" size="lg" icon={LifeBuoy}>
              ติดต่อฝ่าย Billing
            </ButtonLink>
            <ButtonLink href="/login" variant="ghost" size="md" icon={ArrowLeft}>
              กลับหน้าเข้าสู่ระบบ
            </ButtonLink>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          ข้อมูลและวิดีโอทั้งหมดยังถูกเก็บไว้ตามนโยบายการเก็บรักษาข้อมูล
        </p>
      </div>
    </div>
  );
}

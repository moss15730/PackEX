import { ArrowLeft, SearchX } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

export const metadata = { title: "ไม่พบหน้าที่ต้องการ" };

export default function NotFound() {
  return (
    <div className="aurora flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <PackExWordmark />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-8 shadow-lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-subtle text-muted">
            <SearchX size={24} strokeWidth={1.9} />
          </span>

          <p className="tabular mt-5 text-sm font-medium text-brand">404</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            ไม่พบหน้าที่ต้องการ
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            หน้านี้อาจถูกย้าย ลบไปแล้ว หรือลิงก์หลักฐานหมดอายุ
            ลองตรวจสอบลิงก์อีกครั้งหรือกลับไปหน้าหลัก
          </p>

          <div className="mt-7 flex flex-col gap-2">
            <ButtonLink href="/" variant="primary" size="lg" icon={ArrowLeft}>
              กลับหน้าแรก
            </ButtonLink>
            <ButtonLink href="/login" variant="ghost" size="md">
              เข้าสู่ระบบ
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}

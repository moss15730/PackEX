import Link from "next/link";
import { PackExWordmark, PackExMark } from "@/components/brand";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="warehouse-atmosphere relative flex min-h-screen flex-col overflow-hidden">
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-8 md:px-12">
        <PackExWordmark />
        <Link href="/login">
          <Button variant="ghost">เข้าสู่ระบบ</Button>
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-4 text-center sm:px-8 md:px-12">
        <div className="mb-8 animate-[page-enter_500ms_ease-out]">
          <PackExMark size={88} className="mx-auto drop-shadow-[0_12px_40px_color-mix(in_srgb,var(--accent)_35%,transparent)]" />
          <div className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-[var(--ink)]">Pack</span>
            <span className="text-[var(--accent)]">EX</span>
          </div>
        </div>

        <h1 className="max-w-2xl animate-[page-enter_560ms_ease-out] font-[family-name:var(--font-display)] text-3xl font-semibold leading-[1.15] tracking-tight text-[var(--ink)] sm:text-4xl md:text-5xl">
          หลักฐานวิดีโอการแพ็ค
          <span className="mt-1 block text-[var(--accent)]">ที่พิสูจน์ได้ทุกออเดอร์</span>
        </h1>

        <p className="mt-6 max-w-lg animate-[page-enter_620ms_ease-out] text-base leading-relaxed text-[var(--muted)] md:text-lg">
          บันทึกวิดีโอหลายมุมกล้องจากสถานีแพ็ค ตรวจสอบความครบถ้วน
          และแชร์ลิงก์หลักฐานให้ทีมเคลม — สำหรับคลังสินค้าไทย
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-[page-enter_700ms_ease-out]">
          <Link href="/login">
            <Button variant="primary" className="px-7 py-3 text-base">
              เข้าสู่ระบบองค์กร
            </Button>
          </Link>
          <Link href="/login?platform=1">
            <Button variant="outline" className="px-7 py-3 text-base">
              Platform Admin
            </Button>
          </Link>
        </div>
      </main>

      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-4 px-6 py-6 text-xs text-[var(--muted)]">
        <Link href="/privacy" className="transition hover:text-[var(--ink)]">
          นโยบายความเป็นส่วนตัว
        </Link>
        <span className="opacity-40">·</span>
        <Link href="/terms" className="transition hover:text-[var(--ink)]">
          ข้อกำหนดการใช้งาน
        </Link>
      </footer>
    </div>
  );
}

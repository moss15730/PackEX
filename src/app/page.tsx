import Link from "next/link";
import { PackExWordmark } from "@/components/brand";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="warehouse-atmosphere relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <PackExWordmark />
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost">เข้าสู่ระบบ</Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 text-center md:px-10">
        <div className="mb-10 scale-[1.35] md:scale-[1.6]">
          <PackExWordmark className="flex-col items-center gap-4 [&>div]:text-center" />
        </div>

        <h1 className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight text-[var(--ink)] md:text-5xl">
          หลักฐานวิดีโอการแพ็ค
          <span className="block text-[var(--accent)]">ที่พิสูจน์ได้ทุกออเดอร์</span>
        </h1>

        <p className="mt-6 max-w-xl text-base text-[var(--muted)] md:text-lg">
          บันทึกวิดีโอหลายมุมกล้องจากสถานีแพ็ค ตรวจสอบความครบถ้วน
          และแชร์ลิงก์หลักฐานให้ทีมเคลม — ออกแบบสำหรับคลังสินค้าไทย
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login">
            <Button variant="primary" className="px-6 py-3 text-base">
              เข้าสู่ระบบองค์กร
            </Button>
          </Link>
          <Link href="/login?platform=1">
            <Button variant="outline" className="px-6 py-3 text-base">
              Platform Admin
            </Button>
          </Link>
        </div>

        <p className="mt-16 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Industrial warehouse video evidence
        </p>
      </main>

      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-4 px-6 py-6 text-xs text-[var(--muted)]">
        <Link href="/privacy" className="hover:text-[var(--ink)]">
          นโยบายความเป็นส่วนตัว
        </Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-[var(--ink)]">
          ข้อกำหนดการใช้งาน
        </Link>
      </footer>
    </div>
  );
}

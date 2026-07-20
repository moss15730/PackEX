import Link from "next/link";
import { PackEyeWordmark } from "@/components/brand";
import { Card } from "@/components/ui";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/">
          <PackEyeWordmark className="mb-8" />
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
          ข้อกำหนดการใช้งาน / Terms of Service
        </h1>

        <Card className="mt-6 space-y-4 text-sm text-[var(--muted)]">
          <section>
            <h2 className="font-semibold text-[var(--ink)]">ภาษาไทย</h2>
            <p className="mt-2">
              การใช้บริการ PackEye หมายความว่าคุณยอมรับข้อกำหนดนี้และนโยบายความเป็นส่วนตัว
              บริการมีให้ตามสภาพ (&quot;as-is&quot;) สำหรับการบันทึกวิดีโอหลักฐานการแพ็ค
            </p>
            <p className="mt-2">
              องค์กรต้องรับผิดชอบการแจ้งความยินยอมพนักงาน การเก็บวิดีโอ และการใช้ลิงก์แชร์
              ตามกฎหมายที่เกี่ยวข้อง การระงับบัญชีอาจเกิดเมื่อค้างชำระหรือละเมิดข้อกำหนด
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[var(--ink)]">English</h2>
            <p className="mt-2">
              By using PackEye you agree to these terms and our Privacy Policy. The service
              is provided &quot;as-is&quot; for packing video evidence purposes.
            </p>
            <p className="mt-2">
              Tenants are responsible for employee consent, lawful recording, and share link
              usage. Accounts may be suspended for non-payment or policy violations.
            </p>
          </section>
        </Card>

        <p className="mt-6 text-xs text-[var(--muted)]">
          เอกสารฉบับย่อ — จะมีข้อกำหนดฉบับเต็มก่อนเปิด production
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { PackExWordmark } from "@/components/brand";
import { Card } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/">
          <PackExWordmark className="mb-8" />
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
          นโยบายความเป็นส่วนตัว / Privacy Policy
        </h1>

        <Card className="mt-6 space-y-4 text-sm text-[var(--muted)]">
          <section>
            <h2 className="font-semibold text-[var(--ink)]">ภาษาไทย</h2>
            <p className="mt-2">
              PackEX เก็บรวบรวมข้อมูลองค์กร ผู้ใช้งาน วิดีโอการแพ็ค และ metadata
              เพื่อให้บริการหลักฐานการแพ็คสินค้า ข้อมูลถูกแยกตาม tenant (multi-tenant isolation)
              และเก็บตามระยะเวลาที่กำหนดในแพ็กเกจ
            </p>
            <p className="mt-2">
              ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) คุณมีสิทธิขอเข้าถึง แก้ไข
              ส่งออก หรือลบข้อมูล โดยติดต่อ admin ขององค์กรหรือ support@packex.app
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-[var(--ink)]">English</h2>
            <p className="mt-2">
              PackEX processes organizational data, user accounts, packing videos, and
              related metadata to provide video evidence services. Data is isolated per tenant
              and retained per subscription plan limits.
            </p>
            <p className="mt-2">
              Under Thailand&apos;s PDPA, you may request access, correction, export, or
              deletion of personal data via your tenant administrator or support@packex.app.
            </p>
          </section>
        </Card>

        <p className="mt-6 text-xs text-[var(--muted)]">
          เอกสารฉบับย่อ — จะมีนโยบายฉบับเต็มก่อนเปิด production
        </p>
      </div>
    </div>
  );
}

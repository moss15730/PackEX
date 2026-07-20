import Link from "next/link";
import { PackExWordmark } from "@/components/brand";
import { Button, Card } from "@/components/ui";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <PackExWordmark className="mb-8 justify-center" />

        <Card>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-rose-600">
            บัญชีถูกระงับ
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            องค์กรของคุณถูกระงับการใช้งานชั่วคราว มักเกิดจากการค้างชำระหรือเกินขีดจำกัดแพ็กเกจ
            กรุณาชำระเงินหรือติดต่อผู้ดูแล billing เพื่อเปิดใช้ต่อ
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/login">
              <Button variant="primary" className="w-full">
                กลับหน้าเข้าสู่ระบบ
              </Button>
            </Link>
            <a href="mailto:billing@PackEX.app">
              <Button variant="outline" className="w-full">
                ติดต่อ Billing
              </Button>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

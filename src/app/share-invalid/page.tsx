import { ArrowLeft, Unlink } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

export const metadata = {
  title: "ลิงก์หลักฐานไม่ถูกต้อง",
  robots: { index: false, follow: false },
};

/**
 * Rendered by proxy.ts (with a real 404 status) when a share token is malformed.
 * Unknown-but-well-formed tokens are handled by the share page itself.
 */
export default function ShareInvalidPage() {
  return (
    <div className="aurora flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <PackExWordmark />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-8 shadow-lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-subtle text-muted">
            <Unlink size={24} strokeWidth={1.9} />
          </span>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
            ลิงก์หลักฐานไม่ถูกต้อง
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            ลิงก์ที่เปิดไม่อยู่ในรูปแบบที่ถูกต้อง อาจถูกคัดลอกมาไม่ครบหรือพิมพ์ผิด
            กรุณาขอลิงก์ใหม่จากผู้ส่งหลักฐาน
          </p>

          <ButtonLink href="/" variant="secondary" size="lg" icon={ArrowLeft} className="mt-7">
            กลับหน้าแรก
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

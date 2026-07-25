import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { verifyResetToken } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ตั้งรหัสผ่านใหม่",
  robots: { index: false, follow: false },
};

const REASON_MESSAGES: Record<string, string> = {
  invalid: "ลิงก์รีเซ็ตไม่ถูกต้อง หรือถูกคัดลอกมาไม่ครบ",
  expired: "ลิงก์รีเซ็ตหมดอายุแล้ว (มีอายุ 30 นาที)",
  used: "ลิงก์นี้ถูกใช้ตั้งรหัสผ่านไปแล้ว",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const lookup = await verifyResetToken(token);

  return (
    <div className="aurora flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[25rem]">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <PackExWordmark />
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-7 shadow-lg">
          {lookup.ok ? (
            <ResetPasswordForm token={token} email={lookup.record.email} />
          ) : (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-ink">
                <ShieldX size={24} strokeWidth={1.9} />
              </span>
              <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
                ใช้ลิงก์นี้ไม่ได้
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {REASON_MESSAGES[lookup.reason] ?? "ลิงก์ไม่ถูกต้อง"}
              </p>
              <ButtonLink href="/forgot-password" variant="primary" className="mt-6 w-full">
                ขอลิงก์ใหม่
              </ButtonLink>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
          >
            <ArrowLeft size={14} />
            กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}

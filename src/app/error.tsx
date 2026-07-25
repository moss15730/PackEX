"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the platform log drain / Vercel runtime logs.
    console.error("[packex] unhandled route error", error);
  }, [error]);

  return (
    <div className="aurora flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <PackExWordmark />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-8 shadow-lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-ink">
            <AlertTriangle size={24} strokeWidth={1.9} />
          </span>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
            เกิดข้อผิดพลาดในระบบ
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            ระบบไม่สามารถแสดงหน้านี้ได้ชั่วคราว ทีมงานได้รับบันทึกข้อผิดพลาดแล้ว
            กรุณาลองใหม่อีกครั้ง
          </p>

          {error.digest ? (
            <p className="mt-4 rounded-lg bg-subtle px-3 py-2 font-mono text-xs text-muted">
              รหัสอ้างอิง: {error.digest}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-2">
            <Button type="button" size="lg" icon={RotateCcw} onClick={reset}>
              ลองใหม่อีกครั้ง
            </Button>
            <ButtonLink href="/" variant="ghost" size="md" icon={Home}>
              กลับหน้าแรก
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}

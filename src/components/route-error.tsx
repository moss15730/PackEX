"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, Card } from "@/components/ui";

/** In-shell error state so navigation stays usable when one page fails. */
export function RouteError({
  error,
  reset,
  title = "โหลดหน้านี้ไม่สำเร็จ",
  description = "เกิดข้อผิดพลาดระหว่างดึงข้อมูล กรุณาลองใหม่อีกครั้ง",
  scope,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  scope: string;
}) {
  useEffect(() => {
    console.error(`[packex] ${scope} route error`, error);
  }, [error, scope]);

  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-danger-soft text-danger-ink">
        <AlertTriangle size={22} strokeWidth={1.9} />
      </span>
      <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      {error.digest ? (
        <p className="mt-4 rounded-lg bg-subtle px-3 py-2 font-mono text-xs text-muted">
          รหัสอ้างอิง: {error.digest}
        </p>
      ) : null}
      <Button type="button" icon={RotateCcw} className="mt-6" onClick={reset}>
        ลองใหม่อีกครั้ง
      </Button>
    </Card>
  );
}

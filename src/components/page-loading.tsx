"use client";

import { PackExMark } from "@/components/brand";
import { cn } from "@/lib/utils";

export function PageLoading({
  label = "กำลังโหลด...",
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4 p-8",
        compact ? "min-h-[240px]" : "min-h-[min(60vh,520px)] flex-1",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="packex-loader relative flex items-center justify-center">
        <span className="packex-loader-orbit packex-loader-orbit-outer" aria-hidden />
        <span className="packex-loader-orbit packex-loader-orbit-inner" aria-hidden />
        <span className="packex-loader-glow" aria-hidden />
        <span className="packex-loader-mark">
          <PackExMark size={30} />
        </span>
      </div>
      <p className="packex-loader-label text-sm font-medium text-[var(--muted)]">{label}</p>
    </div>
  );
}

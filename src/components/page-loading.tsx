import { PackExMark } from "@/components/brand";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

export function PageLoading({
  label = "กำลังโหลด…",
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
        "flex w-full flex-col items-center justify-center gap-5 p-8",
        compact ? "min-h-[240px]" : "min-h-[min(60vh,520px)] flex-1",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="loader-ring" aria-hidden />
        <span className="loader-ring loader-ring-inner" aria-hidden />
        <span className="loader-glow" aria-hidden />
        <PackExMark size={30} className="relative" />
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}

/** Content-shaped placeholder used while dashboards and tables stream in. */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-fade-in" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-4 h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

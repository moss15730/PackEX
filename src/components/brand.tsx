"use client";

import { cn } from "@/lib/utils";

export function PackEyeMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <ellipse cx="18" cy="14" rx="8" ry="12" fill="#0B0F0E" transform="rotate(-18 18 14)" />
      <ellipse cx="46" cy="14" rx="8" ry="12" fill="#0B0F0E" transform="rotate(18 46 14)" />
      <path
        d="M8 30c0-12 10-22 24-22s24 10 24 22c0 16-10 28-24 28S8 46 8 30z"
        fill="#0B0F0E"
      />
      <circle cx="24" cy="30" r="5" fill="#E8F5E9" />
      <circle cx="24" cy="30" r="2.2" fill="#0B0F0E" />
      <circle cx="40" cy="30" r="7" fill="#1A1F1D" stroke="#2EE56D" strokeWidth="2.5" />
      <circle cx="40" cy="30" r="3.5" fill="#2EE56D" />
      <circle cx="41.5" cy="28.5" r="1.2" fill="#E8F5E9" />
      <path d="M32 36c-2 3-4 4-6 4" stroke="#2EE56D" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 44c2 2 6 3 8 0" stroke="#3A4340" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PackEyeWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <PackEyeMark size={32} />
      <div className="leading-tight">
        <div className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)]">
          PackEye
        </div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Packing Video Systems
        </div>
      </div>
    </div>
  );
}

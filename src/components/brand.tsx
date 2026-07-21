"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function PackExMark({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const bgId = `packex-bg-${uid}`;
  const boxId = `packex-box-${uid}`;
  const lensId = `packex-lens-${uid}`;

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
      <defs>
        <linearGradient id={bgId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#15201c" />
          <stop offset="1" stopColor="#0a0f0d" />
        </linearGradient>
        <linearGradient id={boxId} x1="16" y1="18" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2c3a34" />
          <stop offset="1" stopColor="#1a2420" />
        </linearGradient>
        <linearGradient id={lensId} x1="24" y1="30" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4AF58A" />
          <stop offset="1" stopColor="#1FC95A" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${bgId})`} />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="15.25"
        stroke="#2EE56D"
        strokeOpacity="0.22"
      />

      <path
        d="M15 27L32 17.5L49 27V43.5C49 46.54 46.54 49 43.5 49H20.5C17.46 49 15 46.54 15 43.5V27Z"
        fill={`url(#${boxId})`}
      />
      <path d="M15 27L32 36.5L49 27" stroke="#2EE56D" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M32 36.5V49" stroke="#0B0F0E" strokeWidth="1.2" strokeOpacity="0.4" />

      <circle cx="32" cy="39.5" r="8.75" stroke={`url(#${lensId})`} strokeWidth="2.2" />
      <circle cx="32" cy="39.5" r="4" fill={`url(#${lensId})`} />
      <circle cx="34.1" cy="37.4" r="1.1" fill="#E8F5E9" fillOpacity="0.9" />

      <rect x="22" y="22" width="20" height="3" rx="1.5" fill="#2EE56D" fillOpacity="0.95" />
    </svg>
  );
}

export function PackExWordmark({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-3", className)}
      role="img"
      aria-label="PackEX — Packing Video Systems"
    >
      <PackExMark size={36} />
      <div className="leading-none">
        <div className="font-[family-name:var(--font-display)] text-[18px] font-bold tracking-tight">
          <span className="text-[var(--ink)]">Pack</span>
          <span className="text-[var(--accent)]">EX</span>
        </div>
        <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Packing Video Systems
        </div>
      </div>
    </div>
  );
}

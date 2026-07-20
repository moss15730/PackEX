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
        <linearGradient id={bgId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#101816" />
          <stop offset="1" stopColor="#0B0F0E" />
        </linearGradient>
        <linearGradient id={boxId} x1="16" y1="18" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2A3530" />
          <stop offset="1" stopColor="#1A211E" />
        </linearGradient>
        <linearGradient id={lensId} x1="24" y1="30" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3DF07A" />
          <stop offset="1" stopColor="#2EE56D" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#${bgId})`} />
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="14.5"
        stroke="#2EE56D"
        strokeOpacity="0.18"
      />

      <path
        d="M9 13V9H13M55 9H51V13M9 51V55H13M55 55H51V51"
        stroke="#2EE56D"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M15 27.5L32 18.5L49 27.5V44.5C49 47.81 46.31 50.5 43 50.5H21C17.69 50.5 15 47.81 15 44.5V27.5Z"
        fill={`url(#${boxId})`}
      />
      <path
        d="M15 27.5L32 36.5L49 27.5"
        stroke="#2EE56D"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M32 36.5V50.5" stroke="#0B0F0E" strokeWidth="1.25" strokeOpacity="0.45" />

      <circle cx="32" cy="40" r="9.25" stroke={`url(#${lensId})`} strokeWidth="2.25" />
      <circle cx="32" cy="40" r="4.25" fill={`url(#${lensId})`} />
      <circle cx="34.25" cy="37.75" r="1.15" fill="#E8F5E9" fillOpacity="0.85" />

      <rect x="21" y="22" width="22" height="3.5" rx="1.75" fill="#2EE56D" fillOpacity="0.9" />
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
      <PackExMark size={34} />
      <div className="leading-none">
        <div className="font-[family-name:var(--font-display)] text-[17px] font-bold tracking-tight">
          <span className="text-[var(--ink)]">Pack</span>
          <span className="text-[var(--accent)]">EX</span>
        </div>
        <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
          Packing Video Systems
        </div>
      </div>
    </div>
  );
}

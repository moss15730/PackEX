"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Clock, Lock } from "lucide-react";
import { Callout } from "@/components/ui";
import type { TenantAccessReason } from "@/lib/tenant-access";

type ReadOnlyValue = {
  readOnly: boolean;
  reason: TenantAccessReason;
  message: string;
  trialDaysLeft: number | null;
};

const ReadOnlyContext = createContext<ReadOnlyValue>({
  readOnly: false,
  reason: null,
  message: "",
  trialDaysLeft: null,
});

export function ReadOnlyProvider({
  value,
  children,
}: {
  value: ReadOnlyValue;
  children: ReactNode;
}) {
  return <ReadOnlyContext.Provider value={value}>{children}</ReadOnlyContext.Provider>;
}

/**
 * Components call this to disable their write actions. The server refuses the
 * mutation regardless — this only avoids offering buttons that cannot work.
 */
export function useReadOnly() {
  return useContext(ReadOnlyContext);
}

/** Banner pinned above page content whenever the organisation cannot write. */
export function ReadOnlyBanner() {
  const { readOnly, message, trialDaysLeft, reason } = useReadOnly();

  if (readOnly) {
    return (
      <Callout
        tone="warning"
        icon={Lock}
        title="โหมดดูอย่างเดียว"
        className="mb-6"
      >
        {message}
      </Callout>
    );
  }

  // Gentle heads-up while the trial is still running.
  if (reason === null && trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft >= 0) {
    return (
      <Callout tone="info" icon={Clock} title="ใกล้หมดช่วงทดลองใช้" className="mb-6">
        {trialDaysLeft === 0
          ? "ช่วงทดลองใช้จะหมดวันนี้ — ติดต่อผู้ดูแลระบบผ่านแชทเพื่อใช้งานต่อ"
          : `เหลือเวลาทดลองใช้อีก ${trialDaysLeft} วัน — ติดต่อผู้ดูแลระบบผ่านแชทเพื่อใช้งานต่อ`}
      </Callout>
    );
  }

  return null;
}

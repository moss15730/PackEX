import { prisma } from "@/lib/db";

export type TenantAccessReason = "trial_expired" | "past_due" | "suspended" | null;

export type TenantAccess = {
  /** Reading is always allowed; writing may not be. */
  canWrite: boolean;
  reason: TenantAccessReason;
  trialEndsAt: Date | null;
  /** Negative once the trial has lapsed. */
  trialDaysLeft: number | null;
  planName: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Single source of truth for "may this organisation change anything?".
 *
 * An expired trial keeps full read access — the tenant can still log in, browse
 * evidence and message support — but every mutation is refused until an admin
 * extends the trial or moves them to a paid plan.
 *
 * Expiry is evaluated live rather than trusting the nightly cron, so access
 * flips at the exact moment the trial ends.
 */
export async function getTenantAccess(tenantId: string): Promise<TenantAccess> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      status: true,
      subscription: {
        select: { status: true, trialEndsAt: true, plan: { select: { nameTh: true } } },
      },
    },
  });

  const subscription = tenant?.subscription ?? null;
  const trialEndsAt = subscription?.trialEndsAt ?? null;
  const planName = subscription?.plan?.nameTh ?? null;
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / DAY_MS)
    : null;

  const base = { trialEndsAt, trialDaysLeft, planName };

  if (!tenant) {
    return { canWrite: false, reason: "suspended", ...base };
  }

  if (tenant.status === "suspended") {
    return { canWrite: false, reason: "suspended", ...base };
  }

  if (!subscription) {
    return { canWrite: true, reason: null, ...base };
  }

  if (subscription.status === "trial_expired") {
    return { canWrite: false, reason: "trial_expired", ...base };
  }

  if (subscription.status === "trialing" && trialEndsAt && trialEndsAt.getTime() <= Date.now()) {
    return { canWrite: false, reason: "trial_expired", ...base };
  }

  if (subscription.status === "past_due") {
    return { canWrite: false, reason: "past_due", ...base };
  }

  return { canWrite: true, reason: null, ...base };
}

export const READ_ONLY_MESSAGES: Record<Exclude<TenantAccessReason, null>, string> = {
  trial_expired:
    "หมดช่วงทดลองใช้แล้ว — ดูข้อมูลเดิมได้ทั้งหมด แต่เพิ่ม/แก้ไข/ลบไม่ได้ กรุณาติดต่อผู้ดูแลระบบผ่านแชทเพื่อเปิดใช้งานต่อ",
  past_due:
    "มียอดค้างชำระ — ระบบจำกัดให้ดูข้อมูลได้อย่างเดียวจนกว่าจะชำระเงิน กรุณาติดต่อผู้ดูแลระบบ",
  suspended: "องค์กรถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
};

export function readOnlyMessage(reason: TenantAccessReason) {
  return reason ? READ_ONLY_MESSAGES[reason] : "";
}

export type WriteGuardFailure = { error: string; status: 403 };

/**
 * Guard for mutating API routes. Returns null when the write may proceed.
 *
 *   const denied = await denyIfReadOnly(session.tenantId);
 *   if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
 */
export async function denyIfReadOnly(tenantId: string): Promise<WriteGuardFailure | null> {
  const access = await getTenantAccess(tenantId);
  if (access.canWrite) return null;
  return { error: readOnlyMessage(access.reason), status: 403 };
}

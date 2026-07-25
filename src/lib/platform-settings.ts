import { prisma } from "@/lib/db";

export type TrialPolicy = {
  signupEnabled: boolean;
  trialPlanId: string | null;
  trialDays: number;
  trialMaxStations: number | null;
  trialMaxStorageGb: number | null;
  trialMaxUsers: number | null;
  trialNotice: string | null;
};

export const DEFAULT_TRIAL_POLICY: TrialPolicy = {
  signupEnabled: true,
  trialPlanId: null,
  trialDays: 7,
  trialMaxStations: 1,
  trialMaxStorageGb: 2,
  trialMaxUsers: 3,
  trialNotice: null,
};

/** Reads the single settings row, creating it with defaults on first use. */
export async function getPlatformSettings(): Promise<TrialPolicy> {
  const existing = await prisma.platformSettings.findUnique({ where: { id: "global" } });
  if (existing) {
    return {
      signupEnabled: existing.signupEnabled,
      trialPlanId: existing.trialPlanId,
      trialDays: existing.trialDays,
      trialMaxStations: existing.trialMaxStations,
      trialMaxStorageGb: existing.trialMaxStorageGb,
      trialMaxUsers: existing.trialMaxUsers,
      trialNotice: existing.trialNotice,
    };
  }

  const created = await prisma.platformSettings.create({ data: { id: "global" } });
  return {
    signupEnabled: created.signupEnabled,
    trialPlanId: created.trialPlanId,
    trialDays: created.trialDays,
    trialMaxStations: created.trialMaxStations,
    trialMaxStorageGb: created.trialMaxStorageGb,
    trialMaxUsers: created.trialMaxUsers,
    trialNotice: created.trialNotice,
  };
}

export async function updatePlatformSettings(
  patch: Partial<TrialPolicy>,
  updatedBy: string,
): Promise<TrialPolicy> {
  await getPlatformSettings(); // ensure the row exists

  const saved = await prisma.platformSettings.update({
    where: { id: "global" },
    data: { ...patch, updatedBy },
  });

  return {
    signupEnabled: saved.signupEnabled,
    trialPlanId: saved.trialPlanId,
    trialDays: saved.trialDays,
    trialMaxStations: saved.trialMaxStations,
    trialMaxStorageGb: saved.trialMaxStorageGb,
    trialMaxUsers: saved.trialMaxUsers,
    trialNotice: saved.trialNotice,
  };
}

/** Plan used for self-serve trials: the configured one, else the cheapest. */
export async function resolveTrialPlan(policy: TrialPolicy) {
  if (policy.trialPlanId) {
    const plan = await prisma.plan.findUnique({ where: { id: policy.trialPlanId } });
    if (plan) return plan;
  }
  return prisma.plan.findFirst({ orderBy: { priceMonthly: "asc" } });
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

/** Reserved because they collide with app routes or look official. */
const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "platform",
  "login",
  "logout",
  "signup",
  "share",
  "support",
  "packex",
  "www",
  "app",
  "static",
  "monitoring",
  "health",
]);

export function validateSlug(raw: string): { ok: true; slug: string } | { ok: false; error: string } {
  const slug = raw.trim().toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error: "ใช้ได้เฉพาะ a-z, 0-9 และ - ความยาว 3–32 ตัว และต้องขึ้นต้น/ลงท้ายด้วยตัวอักษรหรือตัวเลข",
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: "ชื่อนี้ถูกสงวนไว้ กรุณาเลือกชื่ออื่น" };
  }
  return { ok: true, slug };
}

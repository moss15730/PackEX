import { prisma } from "./db";

const DEFAULT_CLAIM_REASONS = [
  "สินค้าหายจากกล่อง",
  "ส่งผิดชิ้น / ผิดรุ่น",
  "สินค้าเสียหาย",
  "จำนวนไม่ครบ",
  "แพ็คไม่ตรงออเดอร์",
  "อื่นๆ",
];

export async function seedDefaultClaimReasons(tenantId: string) {
  for (let i = 0; i < DEFAULT_CLAIM_REASONS.length; i++) {
    const label = DEFAULT_CLAIM_REASONS[i];
    await prisma.claimReason.upsert({
      where: { tenantId_label: { tenantId, label } },
      create: { tenantId, label, active: true, sortOrder: i + 1 },
      update: { active: true, sortOrder: i + 1 },
    });
  }
}

export async function ensureOnboardingState(tenantId: string) {
  return prisma.onboardingState.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
}

export async function markOnboardingStep(
  tenantId: string,
  step: "cameraTested" | "localeSet",
) {
  const state = await ensureOnboardingState(tenantId);
  if (state[step]) return state;

  await prisma.onboardingState.update({
    where: { tenantId },
    data: { [step]: true },
  });

  return refreshOnboardingState(tenantId);
}

export async function refreshOnboardingState(tenantId: string) {
  const [stationCount, userCount, recordingCount, existing] = await Promise.all([
    prisma.station.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.recording.count({
      where: { tenantId, status: { in: ["ready", "warning"] } },
    }),
    prisma.onboardingState.findUnique({ where: { tenantId } }),
  ]);

  const updates = {
    stationCreated: stationCount > 0,
    cameraTested: existing?.cameraTested || recordingCount > 0,
    employeesInvited: userCount > 1,
    localeSet: existing?.localeSet ?? false,
    testClipDone: recordingCount > 0,
  };

  const completed = Object.values(updates).every(Boolean);

  return prisma.onboardingState.upsert({
    where: { tenantId },
    create: { tenantId, ...updates, completed },
    update: { ...updates, completed },
  });
}

export async function initializeNewTenant(tenantId: string) {
  await Promise.all([ensureOnboardingState(tenantId), seedDefaultClaimReasons(tenantId)]);
}

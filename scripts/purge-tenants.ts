import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Hard-delete all tenant organizations and related data. Keeps plans & platform admins. */
async function purgeAllTenants() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  if (!tenants.length) {
    console.log("No tenants to delete.");
    return;
  }

  console.log(`Purging ${tenants.length} tenant(s): ${tenants.map((t) => t.slug).join(", ")}`);

  // Order mirrors prisma/seed.ts — child tables first where cascade may not cover everything.
  await prisma.auditLog.deleteMany({ where: { tenantId: { not: null } } });
  await prisma.shareLinkAccess.deleteMany();
  await prisma.shareLink.deleteMany();
  await prisma.claimPackage.deleteMany();
  await prisma.claimCase.deleteMany();
  await prisma.claimReason.deleteMany();
  await prisma.aiCheck.deleteMany();
  await prisma.timelineMarker.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.recordingFile.deleteMany();
  await prisma.recording.deleteMany();
  await prisma.order.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.camera.deleteMany();
  await prisma.stationAgent.deleteMany();
  await prisma.station.deleteMany();
  await prisma.user.deleteMany();
  await prisma.onboardingState.deleteMany();
  await prisma.usageMeter.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.supportAccessGrant.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.tenantSettings.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.tenant.deleteMany();

  console.log("All tenant data removed.");
}

purgeAllTenants()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

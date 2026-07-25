/**
 * Moves an organisation's trial end date — useful for support ("give them 7 more
 * days") and for verifying read-only behaviour without waiting a week.
 *
 * Usage:
 *   npm run trial:set -- <slug> <days-from-now>
 *   npm run trial:set -- acme -1     # expire immediately
 *   npm run trial:set -- acme 14     # extend and reopen writes
 */
import { loadProjectEnv } from "./load-env";

loadProjectEnv();

import { prisma } from "../src/lib/db";
import { addDays } from "date-fns";

async function main() {
  const [slug, daysArg] = process.argv.slice(2);
  const days = Number(daysArg);

  if (!slug || !Number.isFinite(days)) {
    console.error("ใช้: npm run trial:set -- <slug> <days-from-now>");
    process.exitCode = 1;
    return;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, subscription: { select: { id: true, status: true } } },
  });

  if (!tenant?.subscription) {
    console.error(`ไม่พบองค์กร "${slug}" หรือยังไม่มี subscription`);
    process.exitCode = 1;
    return;
  }

  const trialEndsAt = addDays(new Date(), days);
  // Extending re-opens writes; expiring flips the tenant into read-only.
  const status = days > 0 ? "trialing" : "trial_expired";

  await prisma.subscription.update({
    where: { id: tenant.subscription.id },
    data: { trialEndsAt, status },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: days > 0 ? "billing.trial_extended" : "billing.trial_expired_manual",
      entityType: "tenant",
      entityId: tenant.id,
      meta: JSON.stringify({ trialEndsAt: trialEndsAt.toISOString(), status }),
    },
  });

  console.log(
    `\n✅ ${tenant.name} (${slug}) → ${status} · หมดอายุ ${trialEndsAt.toLocaleString("th-TH")}\n`,
  );
}

main()
  .catch((error) => {
    console.error("trial:set failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

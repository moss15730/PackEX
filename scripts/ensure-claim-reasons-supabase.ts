import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULTS = [
  "สินค้าหายจากกล่อง",
  "ส่งผิดชิ้น / ผิดรุ่น",
  "สินค้าเสียหาย",
  "จำนวนไม่ครบ",
  "แพ็คไม่ตรงออเดอร์",
  "อื่นๆ",
];

async function main() {
  // Ensure table exists (in case push didn't hit this project)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClaimReason" (
      "id" TEXT PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "ClaimReason"
        ADD CONSTRAINT "ClaimReason_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ClaimReason_tenantId_label_key"
      ON "ClaimReason"("tenantId", "label");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ClaimReason_tenantId_sortOrder_idx"
      ON "ClaimReason"("tenantId", "sortOrder");
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "ClaimCase" ADD COLUMN IF NOT EXISTS "reasonId" TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "ClaimCase"
        ADD CONSTRAINT "ClaimCase_reasonId_fkey"
        FOREIGN KEY ("reasonId") REFERENCES "ClaimReason"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  console.log(`Tenants: ${tenants.map((t) => t.slug).join(", ") || "(none)"}`);

  for (const t of tenants) {
    for (let i = 0; i < DEFAULTS.length; i++) {
      const label = DEFAULTS[i];
      await prisma.claimReason.upsert({
        where: { tenantId_label: { tenantId: t.id, label } },
        create: {
          tenantId: t.id,
          label,
          active: true,
          sortOrder: i + 1,
        },
        update: { active: true, sortOrder: i + 1 },
      });
    }

    // Link old claim cases that only have reason text
    const reasons = await prisma.claimReason.findMany({
      where: { tenantId: t.id },
    });
    const byLabel = new Map(reasons.map((r) => [r.label, r.id]));

    const orphanCases = await prisma.claimCase.findMany({
      where: { tenantId: t.id, reasonId: null },
    });

    for (const c of orphanCases) {
      const reasonId = byLabel.get(c.reason);
      if (reasonId) {
        await prisma.claimCase.update({
          where: { id: c.id },
          data: { reasonId },
        });
      }
    }

    const count = await prisma.claimReason.count({ where: { tenantId: t.id } });
    console.log(`✓ ${t.slug}: ${count} claim reasons in Supabase`);
  }

  const total = await prisma.claimReason.count();
  console.log(`\nDone. Total ClaimReason rows: ${total}`);
  console.log(`ดูใน Supabase → Table Editor → ClaimReason`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

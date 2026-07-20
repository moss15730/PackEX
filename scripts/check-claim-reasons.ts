import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe<
    { tablename: string }[]
  >(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%claim%' ORDER BY tablename`,
  );
  console.log("claim tables:", tables);

  const cols = await prisma.$queryRawUnsafe<
    { column_name: string; data_type: string }[]
  >(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ClaimReason' ORDER BY ordinal_position`,
  );
  console.log("ClaimReason columns:", cols);

  const reasons = await prisma.claimReason.findMany({
    include: { tenant: { select: { slug: true } } },
    orderBy: [{ tenantId: "asc" }, { sortOrder: "asc" }],
  });
  console.log("reason count:", reasons.length);
  for (const r of reasons) {
    console.log(`- [${r.tenant.slug}] ${r.sortOrder}. ${r.label} (active=${r.active})`);
  }

  const caseCols = await prisma.$queryRawUnsafe<
    { column_name: string }[]
  >(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ClaimCase' AND column_name = 'reasonId'`,
  );
  console.log("ClaimCase.reasonId exists:", caseCols.length > 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

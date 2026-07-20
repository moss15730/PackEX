import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { employeeCode: "" },
    orderBy: { createdAt: "asc" },
  });

  let i = 1;
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { employeeCode: `EMP-${String(i).padStart(3, "0")}` },
    });
    i += 1;
  }

  console.log(`backfilled ${users.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = [
  "สินค้าหายจากกล่อง",
  "ส่งผิดชิ้น / ผิดรุ่น",
  "สินค้าเสียหาย",
  "จำนวนไม่ครบ",
  "แพ็คไม่ตรงออเดอร์",
  "อื่นๆ",
];

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  for (const t of tenants) {
    for (let i = 0; i < defaults.length; i++) {
      await prisma.claimReason.upsert({
        where: { tenantId_label: { tenantId: t.id, label: defaults[i] } },
        create: {
          tenantId: t.id,
          label: defaults[i],
          active: true,
          sortOrder: i + 1,
        },
        update: {},
      });
    }
    console.log("reasons ok for", t.slug);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

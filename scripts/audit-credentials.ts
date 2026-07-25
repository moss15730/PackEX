/**
 * Read-only go-live audit: finds accounts still using the seed demo password,
 * tenants left in the `deleted` state, and env values that must change.
 *
 * Usage: npm run audit:credentials
 */
import { loadProjectEnv } from "./load-env";

loadProjectEnv();

import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { checkProductionEnv } from "../src/lib/env";

const DEMO_PASSWORDS = ["password123", "packex123", "admin123"];

async function usesDemoPassword(hash: string) {
  for (const candidate of DEMO_PASSWORDS) {
    if (await bcrypt.compare(candidate, hash)) return candidate;
  }
  return null;
}

async function main() {
  const [users, admins, tenants] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true, name: true, passwordHash: true, tenant: { select: { slug: true } } },
    }),
    prisma.platformAdmin.findMany({ select: { id: true, email: true, passwordHash: true } }),
    prisma.tenant.findMany({
      select: {
        id: true,
        slug: true,
        status: true,
        _count: { select: { recordings: true, users: true } },
      },
    }),
  ]);

  const weakUsers: string[] = [];
  for (const user of users) {
    const match = await usesDemoPassword(user.passwordHash);
    if (match) weakUsers.push(`${user.email} (tenant ${user.tenant.slug}) → "${match}"`);
  }

  const weakAdmins: string[] = [];
  for (const admin of admins) {
    const match = await usesDemoPassword(admin.passwordHash);
    if (match) weakAdmins.push(`${admin.email} (platform admin) → "${match}"`);
  }

  const softDeleted = tenants.filter((t) => t.status === "deleted");

  console.log("\n=== PackEX go-live credential audit ===\n");

  console.log(`บัญชีทั้งหมด: ${users.length} ผู้ใช้, ${admins.length} platform admin`);

  if (weakUsers.length || weakAdmins.length) {
    console.log(`\n❌ พบ ${weakUsers.length + weakAdmins.length} บัญชีที่ยังใช้รหัสผ่าน demo:`);
    for (const line of [...weakAdmins, ...weakUsers]) console.log(`   - ${line}`);
    console.log("\n   แก้ไข: npm run set-password -- <email> <new-password>");
  } else {
    console.log("\n✅ ไม่มีบัญชีที่ใช้รหัสผ่าน demo");
  }

  if (softDeleted.length) {
    console.log(`\n⚠️  tenant ที่สถานะ deleted แต่ข้อมูลยังอยู่ ${softDeleted.length} รายการ:`);
    for (const t of softDeleted) {
      console.log(`   - ${t.slug} (${t._count.users} ผู้ใช้, ${t._count.recordings} วิดีโอ)`);
    }
    console.log("\n   ลบถาวร: npm run db:purge-deleted");
  } else {
    console.log("\n✅ ไม่มี tenant ค้างสถานะ deleted");
  }

  const issues = checkProductionEnv();
  if (issues.length) {
    console.log(`\n⚠️  ค่าตั้งค่าที่ควรแก้ ${issues.length} รายการ:`);
    for (const issue of issues) console.log(`   - [${issue.level}] ${issue.key}: ${issue.message}`);
  } else {
    console.log("\n✅ ตั้งค่า env ครบถ้วน");
  }

  console.log("");
}

main()
  .catch((error) => {
    console.error("audit failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

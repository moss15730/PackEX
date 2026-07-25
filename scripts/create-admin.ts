/**
 * Creates (or updates) a platform admin account.
 *
 * Usage:
 *   npm run create-admin -- <email> <password> [--name "ชื่อ"] [--role super_admin|support]
 *   npm run create-admin -- <email> <password> --allow-weak
 *
 * `super_admin` can manage every tenant, plan, invoice and data request.
 * `support` is read-mostly and still needs an active Support Grant to enter a tenant.
 */
import { loadProjectEnv } from "./load-env";

loadProjectEnv();

import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { validatePasswordStrength } from "../src/lib/password-reset";

function flagValue(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

async function main() {
  const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const email = positional[0]?.trim().toLowerCase();
  const password = positional[1];

  const role = flagValue("role") ?? "super_admin";
  const allowWeak = process.argv.includes("--allow-weak");

  if (!email || !password) {
    console.error("ใช้: npm run create-admin -- <email> <password> [--name \"ชื่อ\"] [--role super_admin|support]");
    process.exitCode = 1;
    return;
  }

  if (!["super_admin", "support"].includes(role)) {
    console.error(`role ไม่ถูกต้อง: ${role} (ต้องเป็น super_admin หรือ support)`);
    process.exitCode = 1;
    return;
  }

  const name = flagValue("name") ?? email.split("@")[0];

  const weakness = validatePasswordStrength(password);
  if (weakness) {
    if (!allowWeak) {
      console.error(`\n❌ รหัสผ่านไม่ผ่านเกณฑ์: ${weakness}`);
      console.error("   ถ้ายืนยันจะใช้รหัสนี้ ให้เพิ่ม --allow-weak\n");
      process.exitCode = 1;
      return;
    }
    console.warn(`\n⚠️  รหัสผ่านต่ำกว่าเกณฑ์ (${weakness}) — สร้างต่อเพราะระบุ --allow-weak`);
  }

  // A tenant user with the same address would make login ambiguous.
  const conflicting = await prisma.user.findUnique({
    where: { email },
    select: { tenant: { select: { slug: true } } },
  });
  if (conflicting) {
    console.error(
      `\n❌ อีเมลนี้ถูกใช้เป็นผู้ใช้ของ tenant "${conflicting.tenant.slug}" แล้ว — ใช้อีเมลอื่นสำหรับ platform admin\n`,
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.platformAdmin.findUnique({ where: { email }, select: { id: true } });

  const admin = existing
    ? await prisma.platformAdmin.update({
        where: { email },
        data: { passwordHash, role, name },
      })
    : await prisma.platformAdmin.create({
        data: { email, name, role, passwordHash },
      });

  await prisma.auditLog.create({
    data: {
      action: existing ? "platform_admin.updated" : "platform_admin.created",
      entityType: "platform_admin",
      entityId: admin.id,
      meta: JSON.stringify({ email, role }),
    },
  });

  console.log(`\n✅ ${existing ? "อัปเดต" : "สร้าง"} platform admin แล้ว`);
  console.log(`   อีเมล: ${admin.email}`);
  console.log(`   ชื่อ:  ${admin.name}`);
  console.log(`   สิทธิ์: ${admin.role}`);
  console.log(`\n   เข้าสู่ระบบที่ /login?platform=1\n`);
}

main()
  .catch((error) => {
    console.error("create-admin failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

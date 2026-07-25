/**
 * Sets a password for a tenant user or platform admin.
 *
 * Usage:
 *   npm run set-password -- admin@packex.app 'NewStrongPass99'
 *   npm run set-password -- admin@packex.app          (generates a strong one)
 */
import { randomBytes } from "crypto";
import { loadProjectEnv } from "./load-env";

loadProjectEnv();

import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { validatePasswordStrength } from "../src/lib/password-reset";

function generatePassword() {
  // Ambiguous characters removed so it can be read aloud or copied by hand.
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(20);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function main() {
  const [emailArg, passwordArg] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();

  if (!email) {
    console.error("ต้องระบุอีเมล: npm run set-password -- <email> [password]");
    process.exitCode = 1;
    return;
  }

  const password = passwordArg ?? generatePassword();
  const weakness = validatePasswordStrength(password);
  if (weakness) {
    console.error(`รหัสผ่านไม่ผ่านเกณฑ์: ${weakness}`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, tenantId: true } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: "auth.password_set_by_operator",
        entityType: "user",
        entityId: user.id,
      },
    });
    console.log(`\n✅ ตั้งรหัสผ่านใหม่ให้ ${email} (tenant user) แล้ว`);
  } else {
    const admin = await prisma.platformAdmin.findUnique({ where: { email }, select: { id: true } });
    if (!admin) {
      console.error(`ไม่พบบัญชี ${email}`);
      process.exitCode = 1;
      return;
    }
    await prisma.platformAdmin.update({ where: { id: admin.id }, data: { passwordHash } });
    await prisma.auditLog.create({
      data: {
        action: "auth.password_set_by_operator",
        entityType: "platform_admin",
        entityId: admin.id,
      },
    });
    console.log(`\n✅ ตั้งรหัสผ่านใหม่ให้ ${email} (platform admin) แล้ว`);
  }

  if (!passwordArg) {
    console.log(`\n   รหัสผ่านใหม่: ${password}`);
    console.log("   บันทึกไว้ในที่ปลอดภัย — ระบบไม่เก็บรหัสผ่านแบบอ่านกลับได้\n");
  }
}

main()
  .catch((error) => {
    console.error("set-password failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const RESET_TOKEN_TTL_MINUTES = 30;
/** Same shape as share tokens: 32 url-safe characters. */
export const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export type ResetSubject =
  | { kind: "user"; id: string; email: string }
  | { kind: "platform"; id: string; email: string };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Substrings that make a password guessable regardless of length rules —
 * includes the seed demo password so it can never be re-used after go-live.
 */
const WEAK_FRAGMENTS = [
  "password",
  "packex",
  "123456",
  "qwerty",
  "111111",
  "abc123",
  "admin",
  "letmein",
  "welcome",
  "iloveyou",
];

/** Minimum bar for a production password. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "รหัสผ่านต้องยาวอย่างน้อย 10 ตัวอักษร";
  if (password.length > 200) return "รหัสผ่านยาวเกินไป";
  if (!/[a-zA-Z]/.test(password)) return "รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว";
  if (!/[0-9]/.test(password)) return "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว";
  if (/^\s|\s$/.test(password)) return "รหัสผ่านต้องไม่ขึ้นต้นหรือลงท้ายด้วยช่องว่าง";

  const normalized = password.toLowerCase();
  if (WEAK_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
    return "รหัสผ่านนี้เดาง่ายเกินไป — หลีกเลี่ยงคำอย่าง password, packex หรือเลขเรียง";
  }

  // A single repeated character passes the rules above but is trivially guessed.
  if (/^(.)\1+$/.test(password)) return "รหัสผ่านต้องไม่ใช่ตัวอักษรซ้ำตัวเดียว";

  return null;
}

/** Looks up an active account by email across tenant users and platform admins. */
export async function findResetSubject(email: string): Promise<ResetSubject | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, status: true, tenant: { select: { status: true } } },
  });

  if (user && user.status === "active" && user.tenant.status !== "deleted") {
    return { kind: "user", id: user.id, email: user.email };
  }

  const admin = await prisma.platformAdmin.findUnique({
    where: { email: normalized },
    select: { id: true, email: true },
  });

  if (admin) return { kind: "platform", id: admin.id, email: admin.email };

  return null;
}

/**
 * Creates a single-use reset token. Only its hash is persisted; the plaintext is
 * returned once so it can be mailed (or handed over by an admin).
 */
export async function createResetToken(subject: ResetSubject, requestIp?: string) {
  // One live token per account keeps older links from lingering.
  await prisma.passwordResetToken.updateMany({
    where: { subjectKind: subject.kind, subjectId: subject.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      subjectKind: subject.kind,
      subjectId: subject.id,
      email: subject.email,
      tokenHash: hashToken(token),
      expiresAt,
      requestIp,
    },
  });

  return { token, expiresAt };
}

export type ResetTokenLookup =
  | { ok: true; record: { id: string; subjectKind: string; subjectId: string; email: string } }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function verifyResetToken(token: string): Promise<ResetTokenLookup> {
  if (!RESET_TOKEN_PATTERN.test(token)) return { ok: false, reason: "invalid" };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record) return { ok: false, reason: "invalid" };

  // Constant-time compare guards against timing analysis on the stored hash.
  const provided = Buffer.from(hashToken(token));
  const stored = Buffer.from(record.tokenHash);
  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    return { ok: false, reason: "invalid" };
  }

  if (record.usedAt) return { ok: false, reason: "used" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };

  return {
    ok: true,
    record: {
      id: record.id,
      subjectKind: record.subjectKind,
      subjectId: record.subjectId,
      email: record.email,
    },
  };
}

/** Applies the new password and burns the token in one transaction. */
export async function consumeResetToken(tokenId: string, subjectKind: string, subjectId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: tokenId, usedAt: null },
      data: { usedAt: new Date() },
    });

    // updateMany returning 0 means another request already used this token.
    if (claimed.count === 0) {
      throw new Error("TOKEN_ALREADY_USED");
    }

    if (subjectKind === "platform") {
      await tx.platformAdmin.update({ where: { id: subjectId }, data: { passwordHash } });
    } else {
      const user = await tx.user.update({
        where: { id: subjectId },
        data: { passwordHash },
        select: { tenantId: true },
      });
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: subjectId,
          action: "auth.password_reset",
          entityType: "user",
          entityId: subjectId,
        },
      });
    }
  });
}

/** Housekeeping for the retention cron. */
export async function purgeExpiredResetTokens() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.passwordResetToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }] },
  });
  return count;
}

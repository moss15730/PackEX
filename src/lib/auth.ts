import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export { PERMISSIONS, can, type Permission } from "./permissions";

function getAuthSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production");
  }
  return new TextEncoder().encode(value || "packex-dev-secret-change-in-production");
}

const secret = getAuthSecret();

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  kind: "tenant" | "platform";
  tenantId?: string;
  tenantSlug?: string;
  /** Set when platform support enters a tenant via active grant */
  supportGrantId?: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function readSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("packex_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("packex_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("packex_session");
}

async function establishTenantSession(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenant: { id: string; slug: string; status: string };
}) {
  if (user.tenant.status === "suspended") {
    return { error: "บัญชีถูกระงับ กรุณาชำระเงินเพื่อเปิดใช้ต่อ" as const };
  }

  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    kind: "tenant",
    tenantId: user.tenant.id,
    tenantSlug: user.tenant.slug,
  };

  const token = await createSessionToken(session);
  await setSessionCookie(token);
  await prisma.auditLog.create({
    data: {
      tenantId: user.tenant.id,
      userId: user.id,
      action: "login.success",
    },
  });

  return { user: session, tenant: user.tenant };
}

export async function loginTenantByEmail(email: string, password: string) {
  const trimmedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    include: { tenant: true },
  });

  if (!user || user.status !== "active" || user.tenant.status === "deleted") {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" as const };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        action: "login.failed",
        meta: JSON.stringify({ email: trimmedEmail }),
      },
    });
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" as const };
  }

  return establishTenantSession(user);
}

export async function loginPlatform(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const admin = await prisma.platformAdmin.findUnique({ where: { email: normalizedEmail } });
  if (!admin) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" as const };
  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" as const };

  const session: SessionUser = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    kind: "platform",
  };
  const token = await createSessionToken(session);
  await setSessionCookie(token);
  return { user: session };
}

export async function requireTenantSession() {
  const session = await readSession();
  if (!session || session.kind !== "tenant" || !session.tenantId) return null;
  return session;
}

export async function requirePlatformSession() {
  const session = await readSession();
  if (!session || session.kind !== "platform") return null;
  return session;
}

/** Platform support enters a tenant under an active grant (viewer-only session). */
export async function enterTenantWithSupportGrant(opts: {
  platformSession: SessionUser;
  tenantSlug: string;
}) {
  if (opts.platformSession.kind !== "platform") {
    return { error: "ต้องเป็นบัญชีแพลตฟอร์ม" as const };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: opts.tenantSlug },
  });
  if (!tenant || tenant.status === "deleted") {
    return { error: "ไม่พบองค์กร" as const };
  }

  const now = new Date();
  const grant = await prisma.supportAccessGrant.findFirst({
    where: {
      tenantId: tenant.id,
      revokedAt: null,
      expiresAt: { gt: now },
      grantedTo: { equals: opts.platformSession.email, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!grant && opts.platformSession.role !== "super_admin") {
    return {
      error: "ไม่มี Support Grant ที่ยังไม่หมดอายุสำหรับอีเมลนี้" as const,
    };
  }

  const session: SessionUser = {
    id: opts.platformSession.id,
    email: opts.platformSession.email,
    name: `${opts.platformSession.name} (Support)`,
    role: "viewer",
    kind: "tenant",
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    supportGrantId: grant?.id ?? "super_admin_break_glass",
  };

  const token = await createSessionToken(session);
  await setSessionCookie(token);

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: "support.enter",
      entityType: "support_access_grant",
      entityId: grant?.id ?? tenant.id,
      meta: JSON.stringify({
        platformEmail: opts.platformSession.email,
        role: opts.platformSession.role,
        breakGlass: !grant,
      }),
    },
  });

  return { ok: true as const, tenant, grantId: grant?.id ?? null };
}

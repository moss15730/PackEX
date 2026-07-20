import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "packeye-dev-secret-change-in-production",
);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  kind: "tenant" | "platform";
  tenantId?: string;
  tenantSlug?: string;
};

export const PERMISSIONS = {
  "recording.start": ["tenant_admin", "supervisor", "packer"],
  "recording.stop": ["tenant_admin", "supervisor", "packer"],
  "video.view": ["tenant_admin", "supervisor", "packer", "viewer", "claim_officer"],
  "video.download": ["tenant_admin", "supervisor", "claim_officer"],
  "video.share": ["tenant_admin", "supervisor", "claim_officer"],
  "video.delete": ["tenant_admin", "supervisor"],
  "employees.manage": ["tenant_admin"],
  "stations.manage": ["tenant_admin", "supervisor"],
  "billing.view": ["tenant_admin"],
  "claims.manage": ["tenant_admin", "supervisor", "claim_officer"],
  "audit.view": ["tenant_admin", "supervisor"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string, permission: Permission) {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

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
  const token = cookieStore.get("packeye_session")?.value;
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
  cookieStore.set("packeye_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("packeye_session");
}

export async function loginTenant(email: string, password: string, tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant || tenant.status === "deleted") return { error: "ไม่พบองค์กร" as const };
  if (tenant.status === "suspended") return { error: "บัญชีถูกระงับ กรุณาชำระเงินเพื่อเปิดใช้ต่อ" as const };

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (!user || user.status !== "active") return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" as const };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "login.failed",
        meta: JSON.stringify({ email }),
      },
    });
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" as const };
  }

  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    kind: "tenant",
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  };

  const token = await createSessionToken(session);
  await setSessionCookie(token);
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      action: "login.success",
    },
  });

  return { user: session, tenant };
}

export async function loginPlatform(email: string, password: string) {
  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
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

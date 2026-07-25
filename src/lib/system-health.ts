import { prisma } from "@/lib/db";
import { checkProductionEnv, type EnvIssue } from "@/lib/env";
import { getStorageBucket, getSupabaseAdmin, isStorageConfigured } from "@/lib/storage";

export type CheckStatus = "ok" | "warn" | "fail";

export type SystemCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
  latencyMs?: number;
};

async function timed<T>(fn: () => Promise<T>) {
  const started = Date.now();
  try {
    const value = await fn();
    return { value, latencyMs: Date.now() - started, error: null as Error | null };
  } catch (error) {
    return {
      value: null,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/** Round-trips the database with a trivial query. */
export async function checkDatabase(): Promise<SystemCheck> {
  const { error, latencyMs } = await timed(() => prisma.$queryRaw`SELECT 1`);
  if (error) {
    return {
      key: "database",
      label: "ฐานข้อมูล",
      status: "fail",
      detail: error.message.slice(0, 160),
      latencyMs,
    };
  }
  return {
    key: "database",
    label: "ฐานข้อมูล",
    status: latencyMs > 1500 ? "warn" : "ok",
    detail: latencyMs > 1500 ? "ตอบสนองช้ากว่าปกติ" : "เชื่อมต่อปกติ",
    latencyMs,
  };
}

/** Confirms the storage bucket exists and is reachable with the service role key. */
export async function checkStorage(): Promise<SystemCheck> {
  if (!isStorageConfigured()) {
    return {
      key: "storage",
      label: "Storage (วิดีโอ)",
      status: "fail",
      detail: "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    };
  }

  const bucket = getStorageBucket();
  const { value, error, latencyMs } = await timed(async () => {
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("ไม่พบ Supabase client");
    const result = await admin.storage.from(bucket).list("", { limit: 1 });
    if (result.error) throw new Error(result.error.message);
    return result;
  });

  if (error || !value) {
    return {
      key: "storage",
      label: "Storage (วิดีโอ)",
      status: "fail",
      detail: `bucket "${bucket}": ${error?.message.slice(0, 140) ?? "ไม่ตอบสนอง"}`,
      latencyMs,
    };
  }

  return {
    key: "storage",
    label: "Storage (วิดีโอ)",
    status: "ok",
    detail: `bucket "${bucket}" พร้อมใช้งาน`,
    latencyMs,
  };
}

/** Turns env validation into a single check plus the raw issue list. */
export function checkEnvironment(): { check: SystemCheck; issues: EnvIssue[] } {
  const issues = checkProductionEnv();
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  const status: CheckStatus = errors.length ? "fail" : warnings.length ? "warn" : "ok";
  const detail = errors.length
    ? `ขาดค่าที่จำเป็น ${errors.length} รายการ`
    : warnings.length
      ? `ควรตั้งค่าเพิ่ม ${warnings.length} รายการ`
      : "ตั้งค่าครบถ้วน";

  return {
    check: { key: "env", label: "การตั้งค่าระบบ", status, detail },
    issues,
  };
}

/** Background jobs are healthy when retention ran within the last 48 hours. */
export async function checkRetentionJob(): Promise<SystemCheck> {
  const { value, error } = await timed(() =>
    prisma.auditLog.findFirst({
      where: { action: { startsWith: "retention." } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  );

  if (error) {
    return {
      key: "retention",
      label: "งานลบข้อมูลตามนโยบาย",
      status: "warn",
      detail: "ตรวจสอบสถานะไม่ได้",
    };
  }

  if (!value) {
    return {
      key: "retention",
      label: "งานลบข้อมูลตามนโยบาย",
      status: "warn",
      detail: "ยังไม่เคยรัน — ตรวจ Vercel Cron /api/cron/retention",
    };
  }

  const hours = (Date.now() - value.createdAt.getTime()) / 36e5;
  return {
    key: "retention",
    label: "งานลบข้อมูลตามนโยบาย",
    status: hours > 48 ? "warn" : "ok",
    detail:
      hours > 48
        ? `รันล่าสุดเมื่อ ${Math.round(hours)} ชั่วโมงที่แล้ว`
        : `รันล่าสุดเมื่อ ${Math.max(1, Math.round(hours))} ชั่วโมงที่แล้ว`,
  };
}

export async function collectSystemChecks() {
  const env = checkEnvironment();
  const [database, storage, retention] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkRetentionJob(),
  ]);

  const checks = [env.check, database, storage, retention];
  const status: CheckStatus = checks.some((c) => c.status === "fail")
    ? "fail"
    : checks.some((c) => c.status === "warn")
      ? "warn"
      : "ok";

  return { status, checks, envIssues: env.issues };
}

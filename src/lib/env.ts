/** Production / go-live environment checks (fail closed in production). */

export function getMaxUploadBytes() {
  const fromEnv = Number(process.env.SUPABASE_FILE_SIZE_LIMIT || 50 * 1024 * 1024);
  // Leave headroom under Free-tier 50MB and Vercel practical limits.
  return Math.min(Math.max(1_000_000, fromEnv), 48 * 1024 * 1024);
}

export type EnvIssue = { level: "error" | "warning"; key: string; message: string };

export function checkProductionEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const isProd = process.env.NODE_ENV === "production";

  const require = (key: string, message: string) => {
    if (!process.env[key]) {
      issues.push({
        level: isProd ? "error" : "warning",
        key,
        message,
      });
    }
  };

  require("DATABASE_URL", "ต้องมี DATABASE_URL");
  require("AUTH_SECRET", "ต้องมี AUTH_SECRET (≥32 ตัวอักษร) ใน production");
  require("NEXT_PUBLIC_SUPABASE_URL", "ต้องมี Supabase URL สำหรับเก็บวิดีโอ");
  require("SUPABASE_SERVICE_ROLE_KEY", "ต้องมี service role key สำหรับ Storage");

  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
    issues.push({
      level: isProd ? "error" : "warning",
      key: "AUTH_SECRET",
      message: "AUTH_SECRET ควรยาวอย่างน้อย 32 ตัวอักษร",
    });
  }

  if (
    process.env.AUTH_SECRET === "packex-dev-secret-change-in-production" ||
    process.env.AUTH_SECRET === "generate-a-random-secret-at-least-32-chars"
  ) {
    issues.push({
      level: isProd ? "error" : "warning",
      key: "AUTH_SECRET",
      message: "AUTH_SECRET ยังเป็นค่าตัวอย่าง — ต้องสุ่มใหม่ก่อน go-live",
    });
  }

  if (!process.env.CRON_SECRET && isProd) {
    issues.push({
      level: "warning",
      key: "CRON_SECRET",
      message: "แนะนำตั้ง CRON_SECRET สำหรับ /api/cron/retention",
    });
  }

  if (!process.env.STATION_AGENT_KEY && isProd) {
    issues.push({
      level: "warning",
      key: "STATION_AGENT_KEY",
      message: "ตั้งค่าถ้าจะใช้ Station Agent heartbeat",
    });
  }

  return issues;
}

export function assertProductionReady() {
  if (process.env.NODE_ENV !== "production") return;
  const errors = checkProductionEnv().filter((i) => i.level === "error");
  if (errors.length) {
    throw new Error(
      `Production env ไม่ครบ: ${errors.map((e) => `${e.key} (${e.message})`).join("; ")}`,
    );
  }
}

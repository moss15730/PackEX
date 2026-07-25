import { NextResponse } from "next/server";
import { collectSystemChecks } from "@/lib/system-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Uptime/readiness probe. Returns 200 when the app can serve traffic and 503
 * when a hard dependency is down, so external monitors can alert on it.
 * Detail is intentionally coarse — no secrets, no tenant data.
 */
export async function GET() {
  const started = Date.now();
  const { status, checks } = await collectSystemChecks();

  return NextResponse.json(
    {
      status,
      at: new Date().toISOString(),
      tookMs: Date.now() - started,
      checks: checks.map(({ key, status: checkStatus, latencyMs }) => ({
        key,
        status: checkStatus,
        latencyMs,
      })),
    },
    {
      status: status === "fail" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

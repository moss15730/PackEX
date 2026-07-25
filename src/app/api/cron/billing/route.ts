import { NextResponse } from "next/server";
import { runMonthlyBilling } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorizeCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow in development without a secret; required in production.
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const result = await runMonthlyBilling();
  return NextResponse.json({ ok: true, at: new Date().toISOString(), ...result });
}

export async function POST(req: Request) {
  return GET(req);
}

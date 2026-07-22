import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformSession } from "@/lib/auth";

type PlanPayload = {
  code?: string;
  nameTh?: string;
  nameEn?: string;
  maxStations?: number;
  maxStorageGb?: number;
  retentionDays?: number;
  maxUsers?: number;
  allowIpCamera?: boolean;
  allowMultiCam?: boolean;
  allowShareLink?: boolean;
  allowIntegrations?: boolean;
  allowAi?: boolean;
  allowSso?: boolean;
  allowCustomDomain?: boolean;
  priceMonthly?: number;
  trialDays?: number;
};

function toInt(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toBool(v: unknown) {
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "string") return v === "true" || v === "1";
  if (typeof v === "number") return v === 1;
  return false;
}

export async function GET() {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } });
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as PlanPayload;

  const code = String(body.code ?? "").trim();
  const nameTh = String(body.nameTh ?? "").trim();
  const nameEn = String(body.nameEn ?? "").trim();

  const maxStations = toInt(body.maxStations);
  const maxStorageGb = toInt(body.maxStorageGb);
  const retentionDays = toInt(body.retentionDays);
  const maxUsers = toInt(body.maxUsers);
  const priceMonthly = toInt(body.priceMonthly) ?? 0;
  const trialDays = toInt(body.trialDays) ?? 0;

  if (!code || !nameTh || !nameEn) {
    return NextResponse.json({ error: "กรุณากรอก code, nameTh, nameEn" }, { status: 400 });
  }
  if (!maxStations || !maxStorageGb || !retentionDays || !maxUsers) {
    return NextResponse.json({ error: "กรุณากรอกตัวเลขความจุ/ระยะเวลาที่ถูกต้อง" }, { status: 400 });
  }

  const allowIpCamera = toBool(body.allowIpCamera);
  const allowMultiCam = toBool(body.allowMultiCam);
  const allowShareLink = toBool(body.allowShareLink);
  const allowIntegrations = toBool(body.allowIntegrations);
  const allowAi = toBool(body.allowAi);
  const allowSso = toBool(body.allowSso);
  const allowCustomDomain = toBool(body.allowCustomDomain);

  try {
    const plan = await prisma.plan.create({
      data: {
        code,
        nameTh,
        nameEn,
        maxStations,
        maxStorageGb,
        retentionDays,
        maxUsers,
        allowIpCamera,
        allowMultiCam,
        allowShareLink,
        allowIntegrations,
        allowAi,
        allowSso,
        allowCustomDomain,
        priceMonthly,
        trialDays,
      },
    });
    return NextResponse.json({ ok: true, plan }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "สร้างแผนไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


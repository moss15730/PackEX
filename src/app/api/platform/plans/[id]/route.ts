import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformSession } from "@/lib/auth";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const code = body.code !== undefined ? String(body.code ?? "").trim() : undefined;
  const nameTh = body.nameTh !== undefined ? String(body.nameTh ?? "").trim() : undefined;
  const nameEn = body.nameEn !== undefined ? String(body.nameEn ?? "").trim() : undefined;
  const maxStations = body.maxStations !== undefined ? toInt(body.maxStations) : null;
  const maxStorageGb = body.maxStorageGb !== undefined ? toInt(body.maxStorageGb) : null;
  const retentionDays = body.retentionDays !== undefined ? toInt(body.retentionDays) : null;
  const maxUsers = body.maxUsers !== undefined ? toInt(body.maxUsers) : null;
  const priceMonthly = body.priceMonthly !== undefined ? toInt(body.priceMonthly) : null;
  const trialDays = body.trialDays !== undefined ? toInt(body.trialDays) : null;

  const plan = await prisma.plan.findUnique({ where: { id }, select: { id: true } });
  if (!plan) return NextResponse.json({ error: "ไม่พบแผน" }, { status: 404 });

  try {
    const updated = await prisma.plan.update({
      where: { id },
      data: {
        ...(code ? { code } : {}),
        ...(nameTh ? { nameTh } : {}),
        ...(nameEn ? { nameEn } : {}),
        ...(typeof maxStations === "number" && maxStations !== null ? { maxStations } : {}),
        ...(typeof maxStorageGb === "number" && maxStorageGb !== null ? { maxStorageGb } : {}),
        ...(typeof retentionDays === "number" && retentionDays !== null ? { retentionDays } : {}),
        ...(typeof maxUsers === "number" && maxUsers !== null ? { maxUsers } : {}),
        ...(typeof priceMonthly === "number" && priceMonthly !== null ? { priceMonthly } : {}),
        ...(typeof trialDays === "number" && trialDays !== null ? { trialDays } : {}),
        ...(body.allowIpCamera !== undefined ? { allowIpCamera: toBool(body.allowIpCamera) } : {}),
        ...(body.allowMultiCam !== undefined ? { allowMultiCam: toBool(body.allowMultiCam) } : {}),
        ...(body.allowShareLink !== undefined ? { allowShareLink: toBool(body.allowShareLink) } : {}),
        ...(body.allowIntegrations !== undefined ? { allowIntegrations: toBool(body.allowIntegrations) } : {}),
        ...(body.allowAi !== undefined ? { allowAi: toBool(body.allowAi) } : {}),
        ...(body.allowSso !== undefined ? { allowSso: toBool(body.allowSso) } : {}),
        ...(body.allowCustomDomain !== undefined ? { allowCustomDomain: toBool(body.allowCustomDomain) } : {}),
      },
    });

    return NextResponse.json({ ok: true, plan: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "อัปเดตแผนไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const used = await prisma.subscription.count({ where: { planId: id } });
    if (used > 0) {
      return NextResponse.json(
        { error: `ลบไม่สำเร็จ — มี subscription ใช้งานแผนนี้อยู่ ${used} รายการ` },
        { status: 400 },
      );
    }
    await prisma.plan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ลบแผนไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


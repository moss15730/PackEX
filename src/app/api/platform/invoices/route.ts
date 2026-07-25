import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/lib/billing";

export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? undefined;

  const invoices = await prisma.invoice.findMany({
    where: tenantId ? { tenantId } : undefined,
    orderBy: { issuedAt: "desc" },
    take: 100,
    include: { tenant: { select: { slug: true, name: true } } },
  });

  return NextResponse.json({ invoices });
}

/** Issues a one-off invoice (setup fee, overage, manual adjustment). */
export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    tenantId?: string;
    amount?: number | string;
    description?: string;
    status?: string;
    currency?: string;
  };

  const tenantId = body.tenantId?.trim();
  const description = body.description?.trim();
  const amount = Number(body.amount);
  const status = (body.status ?? "open") as InvoiceStatus;

  if (!tenantId || !description) {
    return NextResponse.json({ error: "ต้องระบุองค์กรและรายละเอียด" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000) {
    return NextResponse.json({ error: "จำนวนเงินไม่ถูกต้อง" }, { status: 400 });
  }
  if (!INVOICE_STATUSES.includes(status)) {
    return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "ไม่พบองค์กร" }, { status: 404 });

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      amount: Math.round(amount),
      currency: body.currency?.trim() || "THB",
      status,
      description,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "billing.invoice_created",
      entityType: "invoice",
      entityId: invoice.id,
      meta: JSON.stringify({ amount: invoice.amount, status, by: session.email }),
    },
  });

  return NextResponse.json({ ok: true, invoice }, { status: 201 });
}

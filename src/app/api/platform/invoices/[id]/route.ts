import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/lib/billing";

/** Marks an invoice paid/void — the only mutation platform support needs. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = body.status as InvoiceStatus | undefined;

  if (!status || !INVOICE_STATUSES.includes(status)) {
    return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
  }

  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบใบแจ้งหนี้" }, { status: 404 });

  const invoice = await prisma.invoice.update({ where: { id }, data: { status } });

  // Clearing the balance reactivates a tenant suspended for non-payment.
  if (status === "paid") {
    const openCount = await prisma.invoice.count({
      where: { tenantId: existing.tenantId, status: "open" },
    });
    if (openCount === 0) {
      await prisma.subscription.updateMany({
        where: { tenantId: existing.tenantId, status: "past_due" },
        data: { status: "active" },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId: existing.tenantId,
      action: "billing.invoice_status",
      entityType: "invoice",
      entityId: id,
      meta: JSON.stringify({ from: existing.status, to: status, by: session.email }),
    },
  });

  return NextResponse.json({ ok: true, invoice });
}

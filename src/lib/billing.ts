import { prisma } from "@/lib/db";
import { addMonths, format, startOfMonth } from "date-fns";
import { th } from "date-fns/locale";

export const INVOICE_STATUSES = ["draft", "open", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export function invoiceStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "ร่าง",
    open: "รอชำระ",
    paid: "ชำระแล้ว",
    void: "ยกเลิก",
  };
  return map[status] ?? status;
}

export function invoiceStatusTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "open") return "warning" as const;
  if (status === "void") return "neutral" as const;
  return "info" as const;
}

/** Deterministic description so a period is never billed twice by accident. */
export function periodDescription(periodStart: Date, planNameTh: string) {
  return `ค่าบริการแผน ${planNameTh} · ${format(periodStart, "MMMM yyyy", { locale: th })}`;
}

export type BillingRunResult = {
  createdInvoices: number;
  skipped: number;
  advancedPeriods: number;
  errors: string[];
};

/**
 * Issues one invoice per active paid subscription for the current month.
 * Idempotent: an existing invoice with the same tenant + description is skipped,
 * so re-running the cron (or a manual retry) never double-bills.
 */
export async function runMonthlyBilling(now = new Date()): Promise<BillingRunResult> {
  const result: BillingRunResult = {
    createdInvoices: 0,
    skipped: 0,
    advancedPeriods: 0,
    errors: [],
  };

  const periodStart = startOfMonth(now);
  const periodEnd = addMonths(periodStart, 1);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ["active", "past_due"] },
      tenant: { status: { in: ["active", "trial"] } },
    },
    include: { plan: true, tenant: { select: { id: true, slug: true } } },
  });

  for (const sub of subscriptions) {
    try {
      if (sub.plan.priceMonthly <= 0) {
        result.skipped += 1;
        continue;
      }

      const description = periodDescription(periodStart, sub.plan.nameTh);
      const existing = await prisma.invoice.findFirst({
        where: { tenantId: sub.tenantId, description },
        select: { id: true },
      });

      if (existing) {
        result.skipped += 1;
        continue;
      }

      await prisma.invoice.create({
        data: {
          tenantId: sub.tenantId,
          amount: sub.plan.priceMonthly,
          currency: "THB",
          status: "open",
          issuedAt: now,
          description,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: sub.tenantId,
          action: "billing.invoice_issued",
          entityType: "invoice",
          meta: JSON.stringify({
            amount: sub.plan.priceMonthly,
            plan: sub.plan.code,
            period: format(periodStart, "yyyy-MM"),
          }),
        },
      });

      result.createdInvoices += 1;

      if (!sub.currentPeriodEnd || sub.currentPeriodEnd < periodEnd) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { currentPeriodEnd: periodEnd },
        });
        result.advancedPeriods += 1;
      }
    } catch (error) {
      result.errors.push(
        `${sub.tenant.slug}: ${error instanceof Error ? error.message : "billing failed"}`,
      );
    }
  }

  await prisma.auditLog
    .create({
      data: {
        action: "billing.run",
        entityType: "cron",
        meta: JSON.stringify({ ...result, period: format(periodStart, "yyyy-MM") }),
      },
    })
    .catch(() => undefined);

  return result;
}

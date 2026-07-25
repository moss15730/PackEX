import { redirect } from "next/navigation";
import { CircleDollarSign, ReceiptText, TrendingUp } from "lucide-react";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Stat } from "@/components/ui";
import { PlatformInvoicesManager } from "@/components/platform-invoices-manager";
import { startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function PlatformBillingPage() {
  const session = await requirePlatformSession();
  if (!session) redirect("/login?platform=1");

  const monthStart = startOfMonth(new Date());

  const [invoices, tenants, openAgg, paidThisMonth] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { issuedAt: "desc" },
      take: 100,
      include: { tenant: { select: { slug: true, name: true } } },
    }),
    prisma.tenant.findMany({
      where: { status: { not: "deleted" } },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true },
    }),
    prisma.invoice.aggregate({ where: { status: "open" }, _sum: { amount: true }, _count: true }),
    prisma.invoice.aggregate({
      where: { status: "paid", issuedAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="การเรียกเก็บเงิน"
        description="ใบแจ้งหนี้ของทุกองค์กร ออกอัตโนมัติรายเดือนจากแผนที่ใช้งานอยู่"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="ยอดค้างชำระ"
          value={`฿${(openAgg._sum.amount ?? 0).toLocaleString()}`}
          icon={CircleDollarSign}
          tone={(openAgg._sum.amount ?? 0) > 0 ? "warning" : "default"}
          hint={`${openAgg._count} ใบแจ้งหนี้`}
        />
        <Stat
          label="รับชำระเดือนนี้"
          value={`฿${(paidThisMonth._sum.amount ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          tone="success"
        />
        <Stat label="ใบแจ้งหนี้ทั้งหมด" value={invoices.length} icon={ReceiptText} />
      </div>

      <PlatformInvoicesManager
        canManage={session.role === "super_admin"}
        tenants={tenants}
        invoices={invoices.map((inv) => ({
          id: inv.id,
          tenantSlug: inv.tenant.slug,
          tenantName: inv.tenant.name,
          amount: inv.amount,
          currency: inv.currency,
          status: inv.status,
          description: inv.description,
          issuedAt: inv.issuedAt.toISOString(),
        }))}
      />
    </div>
  );
}

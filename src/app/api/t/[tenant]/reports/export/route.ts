import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format, startOfDay, subDays } from "date-fns";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const tenantId = session.tenantId;
  const weekAgo = subDays(startOfDay(new Date()), 7);

  const [recordings, claims] = await Promise.all([
    prisma.recording.findMany({
      where: { tenantId, startedAt: { gte: weekAgo } },
      include: {
        order: { select: { orderNo: true } },
        employee: { select: { name: true, employeeCode: true } },
        station: { select: { code: true } },
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.claimCase.findMany({
      where: { tenantId },
      include: { order: { select: { orderNo: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows = [
    ["ประเภท", "เลขออเดอร์", "สถานะ", "คะแนนครบถ้วน", "พนักงาน", "สถานี", "วันที่"],
    ...recordings.map((r) => [
      "วิดีโอ",
      r.order.orderNo,
      r.status,
      String(r.completenessScore),
      `${r.employee.name} (${r.employee.employeeCode})`,
      r.station.code,
      format(r.startedAt, "yyyy-MM-dd HH:mm"),
    ]),
    ...claims.map((c) => [
      "เคลม",
      c.order.orderNo,
      c.status,
      "",
      "",
      "",
      format(c.createdAt, "yyyy-MM-dd HH:mm"),
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="packex-report-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}

import { redirect } from "next/navigation";
import { Badge, PageHeader } from "@/components/ui";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PlatformDataRequestsManager } from "@/components/platform-data-requests-manager";

export const dynamic = "force-dynamic";

export default async function PlatformDataRequestsPage() {
  const session = await requirePlatformSession();
  if (!session) redirect("/login?platform=1");

  const requests = await prisma.dataRequest.findMany({ orderBy: { createdAt: "desc" } });

  const tenants = await prisma.tenant.findMany({
    where: { id: { in: [...new Set(requests.map((r) => r.tenantId))] } },
    select: { id: true, slug: true, name: true },
  });
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const rows = requests.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    tenantSlug: tenantMap.get(r.tenantId)?.slug ?? r.tenantId,
    tenantName: tenantMap.get(r.tenantId)?.name ?? "องค์กรที่ถูกลบแล้ว",
    type: r.type,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  const open = rows.filter((r) => r.status === "pending" || r.status === "processing").length;

  return (
    <div>
      <PageHeader
        title="Data requests"
        description="คำขอส่งออกหรือลบข้อมูลส่วนบุคคลตาม PDPA — ทุกการดำเนินการถูกบันทึกใน audit log"
        actions={
          open > 0 ? (
            <Badge tone="warning" dot>
              ค้างดำเนินการ {open} รายการ
            </Badge>
          ) : (
            <Badge tone="success" dot>
              ไม่มีคำขอค้าง
            </Badge>
          )
        }
      />

      <PlatformDataRequestsManager
        requests={rows}
        canManage={session.role === "super_admin"}
      />
    </div>
  );
}

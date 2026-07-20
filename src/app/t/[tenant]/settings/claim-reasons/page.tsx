import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ClaimReasonsManager } from "@/components/claim-reasons-manager";

export default async function ClaimReasonsSettingsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const claimReasons = await prisma.claimReason.findMany({
    where: { tenantId: session.tenantId },
    include: { _count: { select: { cases: true } } },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  const canManage = can(session.role, "claim_reasons.manage");

  return (
    <div>
      <PageHeader
        title="เหตุผลเคลม"
        description="จัดการรายการเหตุผลสำหรับดรอปดาวน์ตอนสร้างเคสเคลม"
      />
      <ClaimReasonsManager
        tenantSlug={session.tenantSlug!}
        canManage={canManage}
        reasons={claimReasons.map((r) => ({
          id: r.id,
          label: r.label,
          active: r.active,
          sortOrder: r.sortOrder,
          caseCount: r._count.cases,
        }))}
      />
    </div>
  );
}

import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { statusLabel } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function ClaimsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const claims = await prisma.claimCase.findMany({
    where: { tenantId: session.tenantId },
    include: {
      order: true,
      packages: { include: { recording: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="เคสเคลม"
        description="จัดการเคสเคลมและหลักฐานวิดีโอที่เกี่ยวข้อง"
      />

      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        <strong>Legal Hold:</strong> วิดีโอที่อยู่ในเคสเคลมจะไม่ถูกลบตาม retention policy
        จนกว่าเคสจะปิดและยกเลิก hold
      </div>

      <div className="space-y-4">
        {claims.map((claim) => (
          <Card key={claim.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[var(--ink)]">{claim.order.orderNo}</h2>
                  <Badge tone={claim.status === "open" ? "warning" : claim.status === "reviewing" ? "info" : "neutral"}>
                    {statusLabel(claim.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{claim.reason}</p>
              </div>
              <time className="text-xs text-[var(--muted)]">
                {format(claim.createdAt, "d MMM yyyy", { locale: th })}
              </time>
            </div>
            {claim.packages.length > 0 && (
              <div className="mt-3 text-sm text-[var(--muted)]">
                แพ็คเกจหลักฐาน: {claim.packages.length} รายการ
                {claim.packages.some((p) => p.recording.legalHold) && (
                  <Badge tone="danger" className="ml-2">
                    Legal Hold
                  </Badge>
                )}
              </div>
            )}
          </Card>
        ))}
        {claims.length === 0 && (
          <p className="text-center text-[var(--muted)]">ยังไม่มีเคสเคลม</p>
        )}
      </div>
    </div>
  );
}

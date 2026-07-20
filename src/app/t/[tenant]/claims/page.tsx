import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ClaimsManager } from "@/components/claims-manager";

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNo?: string; recordingId?: string }>;
}) {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const { orderNo, recordingId } = await searchParams;
  const tenantId = session.tenantId;
  const canManage = can(session.role, "claims.manage");

  const [claims, evidence, reasons] = await Promise.all([
    prisma.claimCase.findMany({
      where: { tenantId },
      include: {
        order: true,
        packages: { include: { recording: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.recording.findMany({
      where: {
        tenantId,
        status: { notIn: ["deleted", "canceled"] },
      },
      include: { order: true, station: true },
      orderBy: { startedAt: "desc" },
      take: 100,
    }),
    prisma.claimReason.findMany({
      where: { tenantId, active: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="เคสเคลม"
        description="สร้างเคส แนบวิดีโอหลักฐาน และเปิด Legal Hold"
      />
      <ClaimsManager
        tenantSlug={session.tenantSlug!}
        canManage={canManage}
        initialOrderNo={orderNo}
        initialRecordingId={recordingId}
        reasonOptions={reasons.map((r) => ({ id: r.id, label: r.label }))}
        claims={claims.map((claim) => ({
          id: claim.id,
          orderNo: claim.order.orderNo,
          reason: claim.reason,
          status: claim.status,
          createdAt: claim.createdAt.toISOString(),
          packageCount: claim.packages.length,
          hasLegalHold: claim.packages.some((p) => p.recording.legalHold),
          recordingIds: claim.packages.map((p) => p.recordingId),
        }))}
        evidenceOptions={evidence.map((rec) => ({
          id: rec.id,
          orderNo: rec.order.orderNo,
          stationCode: rec.station.code,
          status: rec.status,
          startedAt: rec.startedAt.toISOString(),
          completenessScore: rec.completenessScore,
        }))}
      />
    </div>
  );
}

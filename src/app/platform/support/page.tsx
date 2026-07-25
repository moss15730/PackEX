import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PlatformSupportManager } from "@/components/platform-support-manager";

export default async function PlatformSupportPage() {
  const grants = await prisma.supportAccessGrant.findMany({
    include: { tenant: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Support grants"
        description="สิทธิ์เข้าถึงข้อมูล tenant ชั่วคราวสำหรับทีมซัพพอร์ต — ทุกการเข้าถึงถูกบันทึกไว้"
      />
      <PlatformSupportManager
        grants={grants.map((g) => ({
          id: g.id,
          reason: g.reason,
          grantedTo: g.grantedTo,
          expiresAt: g.expiresAt.toISOString(),
          revokedAt: g.revokedAt?.toISOString() ?? null,
          tenant: g.tenant,
        }))}
      />
    </div>
  );
}

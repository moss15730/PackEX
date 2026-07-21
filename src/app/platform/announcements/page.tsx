import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PlatformAnnouncementsManager } from "@/components/platform-announcements-manager";

export default async function PlatformAnnouncementsPage() {
  const [announcements, tenants] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        targets: {
          include: { tenant: { select: { id: true, slug: true, name: true } } },
        },
      },
    }),
    prisma.tenant.findMany({
      where: { status: { not: "deleted" } },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true, status: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="ประกาศ"
        description="ส่งประกาศจากแพลตฟอร์มไปยังแจ้งเตือนขององค์กรที่เลือก"
      />
      <PlatformAnnouncementsManager
        tenants={tenants}
        announcements={announcements.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          active: a.active,
          targetAll: a.targetAll,
          createdAt: a.createdAt.toISOString(),
          targets: a.targets.map((t) => ({
            id: t.tenant.id,
            slug: t.tenant.slug,
            name: t.tenant.name,
          })),
        }))}
      />
    </div>
  );
}

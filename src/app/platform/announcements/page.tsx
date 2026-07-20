import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function PlatformAnnouncementsPage() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="ประกาศ" description="ประกาศแพลตฟอร์มถึง tenant ทั้งหมด" />

      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[var(--ink)]">{a.title}</h2>
              <Badge tone={a.active ? "success" : "neutral"}>
                {a.active ? "ใช้งาน" : "ปิด"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{a.body}</p>
            <time className="mt-2 block text-xs text-[var(--muted)]">
              {format(a.createdAt, "d MMM yyyy", { locale: th })}
            </time>
          </Card>
        ))}
      </div>
    </div>
  );
}

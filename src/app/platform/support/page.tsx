import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge } from "@/components/ui";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function PlatformSupportPage() {
  const grants = await prisma.supportAccessGrant.findMany({
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Support Grants" description="สิทธิ์เข้าถึง tenant ชั่วคราวสำหรับทีม support" />

      <div className="space-y-3">
        {grants.map((g) => {
          const expired = g.expiresAt < new Date();
          const revoked = !!g.revokedAt;
          return (
            <Card key={g.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono">{g.tenant.slug}</span>
                <Badge tone={revoked ? "neutral" : expired ? "danger" : "success"}>
                  {revoked ? "ยกเลิกแล้ว" : expired ? "หมดอายุ" : "ใช้งานได้"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{g.reason}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                ให้กับ {g.grantedTo} · หมดอายุ{" "}
                {format(g.expiresAt, "d MMM yyyy HH:mm", { locale: th })}
              </p>
            </Card>
          );
        })}
        {grants.length === 0 && (
          <p className="text-center text-[var(--muted)]">ไม่มี grant</p>
        )}
      </div>
    </div>
  );
}

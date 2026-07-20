import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function AuditPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: session.tenantId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Audit Log" description="บันทึกการกระทำในระบบ" />

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">เวลา</th>
              <th className="px-4 py-3 font-medium">ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">การกระทำ</th>
              <th className="px-4 py-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 whitespace-nowrap text-[var(--muted)]">
                  {format(log.createdAt, "d MMM HH:mm:ss", { locale: th })}
                </td>
                <td className="px-4 py-3">{log.user?.name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {log.entityType ? `${log.entityType}:${log.entityId?.slice(0, 8)}…` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="px-4 py-8 text-center text-[var(--muted)]">ไม่มีบันทึก</p>
        )}
      </Card>
    </div>
  );
}

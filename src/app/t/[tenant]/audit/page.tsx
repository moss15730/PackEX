import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Avatar,
  Badge,
  EmptyState,
  PageHeader,
  Table,
  TableCard,
  TBody,
  Td,
  Th,
  THead,
  Toolbar,
  Tr,
} from "@/components/ui";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function AuditPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId || !session.tenantSlug) return null;

  if (!can(session.role, "audit.view")) {
    redirect(`/t/${session.tenantSlug}/dashboard`);
  }

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: session.tenantId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const empty = (
    <EmptyState
      icon={ClipboardList}
      title="ยังไม่มีบันทึกกิจกรรม"
      description="ทุกการกระทำสำคัญในระบบ เช่น การลบวิดีโอหรือแชร์ลิงก์ จะถูกบันทึกไว้ที่นี่"
    />
  );

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="บันทึกการกระทำทั้งหมดในระบบ เรียงจากล่าสุด (100 รายการล่าสุด)"
      />

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {logs.length === 0
          ? empty
          : logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={log.user?.name ?? "?"} size={28} />
                    <span className="truncate text-sm font-medium text-ink">
                      {log.user?.name ?? "ระบบ"}
                    </span>
                  </div>
                  <time className="shrink-0 text-xs text-faint tabular">
                    {format(log.createdAt, "d MMM HH:mm", { locale: th })}
                  </time>
                </div>
                <p className="mt-3 font-mono text-xs text-ink-2">{log.action}</p>
                <p className="mt-1 text-xs text-muted">
                  {log.entityType ? `${log.entityType}:${log.entityId?.slice(0, 8)}…` : "—"}
                </p>
              </div>
            ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        {logs.length === 0 ? (
          empty
        ) : (
          <TableCard
            header={
              <Toolbar actions={<span className="text-xs text-muted">{logs.length} รายการ</span>}>
                <span className="text-[13px] font-medium text-ink">กิจกรรมล่าสุด</span>
              </Toolbar>
            }
          >
            <Table>
              <THead>
                <Th>เวลา</Th>
                <Th>ผู้ใช้</Th>
                <Th>การกระทำ</Th>
                <Th>Entity</Th>
              </THead>
              <TBody>
                {logs.map((log) => (
                  <Tr key={log.id}>
                    <Td className="whitespace-nowrap text-muted">
                      {format(log.createdAt, "d MMM HH:mm:ss", { locale: th })}
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar name={log.user?.name ?? "?"} size={26} />
                        <span className="text-ink">{log.user?.name ?? "ระบบ"}</span>
                      </span>
                    </Td>
                    <Td>
                      <Badge className="font-mono">{log.action}</Badge>
                    </Td>
                    <Td className="text-muted">
                      {log.entityType ? (
                        <span className="font-mono text-xs">
                          {log.entityType}:{log.entityId?.slice(0, 8)}…
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableCard>
        )}
      </div>
    </div>
  );
}

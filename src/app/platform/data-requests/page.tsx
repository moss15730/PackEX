import { Database, Download, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import {
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

export default async function PlatformDataRequestsPage() {
  const requests = await prisma.dataRequest.findMany({ orderBy: { createdAt: "desc" } });

  const tenantIds = [...new Set(requests.map((r) => r.tenantId))];
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, slug: true },
  });
  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t.slug]));

  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Data requests"
        description="คำขอส่งออกหรือลบข้อมูลส่วนบุคคลตาม PDPA"
        actions={
          pending > 0 ? (
            <Badge tone="warning" dot>
              รอดำเนินการ {pending} รายการ
            </Badge>
          ) : null
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={Database}
          title="ไม่มีคำขอข้อมูล"
          description="เมื่อ tenant ยื่นคำขอส่งออกหรือลบข้อมูล รายการจะปรากฏที่นี่"
        />
      ) : (
        <TableCard
          minWidthClassName="min-w-[640px]"
          header={
            <Toolbar
              actions={<span className="text-xs text-muted">{requests.length} รายการ</span>}
            >
              <span className="text-[13px] font-medium text-ink">คำขอทั้งหมด</span>
            </Toolbar>
          }
        >
          <Table>
            <THead>
              <Th>Tenant</Th>
              <Th>ประเภท</Th>
              <Th>สถานะ</Th>
              <Th align="right">วันที่ยื่น</Th>
            </THead>
            <TBody>
              {requests.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-ink">{tenantMap[r.tenantId] ?? r.tenantId}</Td>
                  <Td>
                    <Badge
                      tone={r.type === "export" ? "info" : "danger"}
                      icon={r.type === "export" ? Download : Trash2}
                    >
                      {r.type === "export" ? "ส่งออกข้อมูล" : "ลบข้อมูล"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={r.status === "pending" ? "warning" : "success"} dot>
                      {r.status}
                    </Badge>
                  </Td>
                  <Td align="right" className="text-muted">
                    {format(r.createdAt, "d MMM yyyy", { locale: th })}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableCard>
      )}
    </div>
  );
}

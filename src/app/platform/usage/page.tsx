import { Activity } from "lucide-react";
import { prisma } from "@/lib/db";
import {
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

export default async function PlatformUsagePage() {
  const meters = await prisma.usageMeter.findMany({
    include: { tenant: true },
    orderBy: { storageUsedGb: "desc" },
  });

  const totalStorage = meters.reduce((sum, m) => sum + m.storageUsedGb, 0);

  return (
    <div>
      <PageHeader
        title="การใช้งาน"
        description="ทรัพยากรที่แต่ละ tenant ใช้อยู่ เรียงตามพื้นที่จัดเก็บ"
      />

      {meters.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="ยังไม่มีข้อมูลการใช้งาน"
          description="เมื่อ tenant เริ่มบันทึกวิดีโอ ตัวเลขการใช้งานจะแสดงที่นี่"
        />
      ) : (
        <TableCard
          minWidthClassName="min-w-[560px]"
          header={
            <Toolbar
              actions={
                <span className="tabular text-xs text-muted">
                  รวม {totalStorage.toFixed(1)} GB · {meters.length} tenants
                </span>
              }
            >
              <span className="text-[13px] font-medium text-ink">การใช้งานตาม tenant</span>
            </Toolbar>
          }
        >
          <Table>
            <THead>
              <Th>Tenant</Th>
              <Th align="right">สถานี</Th>
              <Th align="right">พื้นที่ (GB)</Th>
              <Th align="right">ผู้ใช้</Th>
            </THead>
            <TBody>
              {meters.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{m.tenant.name}</p>
                      <p className="font-mono text-xs text-muted">{m.tenant.slug}</p>
                    </div>
                  </Td>
                  <Td align="right" className="tabular">
                    {m.stationsUsed}
                  </Td>
                  <Td align="right" className="tabular font-medium text-ink">
                    {m.storageUsedGb.toFixed(1)}
                  </Td>
                  <Td align="right" className="tabular">
                    {m.usersUsed}
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

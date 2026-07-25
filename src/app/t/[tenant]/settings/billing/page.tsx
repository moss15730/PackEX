import { redirect } from "next/navigation";
import { AlertTriangle, Camera, HardDrive, Info, ReceiptText, Users } from "lucide-react";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Badge,
  Callout,
  Card,
  EmptyState,
  PageHeader,
  Progress,
  Table,
  TableCard,
  TBody,
  Td,
  Th,
  THead,
  Toolbar,
  Tr,
} from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/utils";
import { invoiceStatusLabel, invoiceStatusTone } from "@/lib/billing";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getUsageAndLimits } from "@/lib/tenant-limits";

function QuotaCard({
  label,
  used,
  limit,
  unit,
  pct,
  icon: Icon,
}: {
  label: string;
  used: string;
  limit: string;
  unit?: string;
  pct: number;
  icon: typeof Camera;
}) {
  const tone = pct >= 100 ? "danger" : pct >= 80 ? "warning" : "brand";
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-subtle text-muted">
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
      <p className="tabular mt-3 text-2xl leading-none font-semibold tracking-tight text-ink">
        {used}
        <span className="text-base font-normal text-muted">
          {" / "}
          {limit}
          {unit ? ` ${unit}` : ""}
        </span>
      </p>
      <Progress className="mt-4" value={Math.min(pct, 100)} tone={tone} />
      <p className="mt-2 text-xs text-muted">ใช้ไปแล้ว {pct}%</p>
    </Card>
  );
}

export default async function SettingsBillingPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId || !session.tenantSlug) return null;

  if (!can(session.role, "billing.view")) {
    redirect(`/t/${session.tenantSlug}/dashboard`);
  }

  const tenantId = session.tenantId;

  const [subscription, { limits, usage }, invoices] = await Promise.all([
    prisma.subscription.findUnique({ where: { tenantId }, include: { plan: true } }),
    getUsageAndLimits(tenantId),
    prisma.invoice.findMany({ where: { tenantId }, orderBy: { issuedAt: "desc" }, take: 6 }),
  ]);

  if (!subscription || !limits) return null;

  const plan = subscription.plan;
  const { maxStations, maxStorageGb, maxUsers } = limits;

  const stationsPct = Math.round((usage.stationsUsed / maxStations) * 100);
  const storagePct = Math.round((usage.storageUsedGb / maxStorageGb) * 100);
  const usersPct = Math.round((usage.usersUsed / maxUsers) * 100);

  const nearLimit = stationsPct >= 80 || storagePct >= 80 || usersPct >= 80;
  const overLimit = stationsPct >= 100 || storagePct >= 100 || usersPct >= 100;
  const hasOverride =
    limits.maxStationsOverride != null ||
    limits.maxStorageGbOverride != null ||
    limits.maxUsersOverride != null;

  return (
    <div>
      <PageHeader
        title="แพ็กเกจและการใช้งาน"
        description="ติดตามโควต้าการใช้งานและประวัติการเรียกเก็บเงินขององค์กร"
        actions={
          <Badge tone={statusTone(subscription.status)} dot>
            แผน {plan.nameTh} · {statusLabel(subscription.status)}
          </Badge>
        }
      />

      <div className="space-y-4">
        {overLimit ? (
          <Callout tone="danger" icon={AlertTriangle} title="เกินขีดจำกัดแพ็กเกจ">
            ไม่สามารถเพิ่มสถานี ผู้ใช้ หรืออัดวิดีโอใหม่ได้ จนกว่าจะลดการใช้งานหรือขอเพิ่มโควต้า
          </Callout>
        ) : nearLimit ? (
          <Callout tone="warning" icon={AlertTriangle} title="การใช้งานใกล้เต็ม">
            พิจารณาลบวิดีโอเก่าที่ไม่จำเป็น หรือติดต่อทีมงานเพื่อขอเพิ่มโควต้า
          </Callout>
        ) : null}

        {hasOverride ? (
          <Callout tone="info" icon={Info}>
            องค์กรนี้มีโควต้าเฉพาะที่ Platform Admin กำหนดไว้ ซึ่งอาจต่างจากแผนมาตรฐาน
          </Callout>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <QuotaCard
          label="สถานี"
          icon={Camera}
          used={String(usage.stationsUsed)}
          limit={String(maxStations)}
          pct={stationsPct}
        />
        <QuotaCard
          label="พื้นที่วิดีโอ"
          icon={HardDrive}
          used={usage.storageUsedGb.toFixed(2)}
          limit={String(maxStorageGb)}
          unit="GB"
          pct={storagePct}
        />
        <QuotaCard
          label="ผู้ใช้"
          icon={Users}
          used={String(usage.usersUsed)}
          limit={String(maxUsers)}
          pct={usersPct}
        />
      </div>

      <div className="mt-6">
        {invoices.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="ยังไม่มีใบแจ้งหนี้"
            description="เมื่อรอบบิลแรกถูกออก ใบแจ้งหนี้จะแสดงที่นี่"
          />
        ) : (
          <>
            {/* Mobile */}
            <div className="space-y-3 md:hidden">
              {invoices.map((inv) => (
                <div key={inv.id} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{inv.description}</p>
                    <Badge tone={invoiceStatusTone(inv.status)} dot>
                      {invoiceStatusLabel(inv.status)}
                    </Badge>
                  </div>
                  <p className="tabular mt-2 text-[13px] text-muted">
                    {inv.amount.toLocaleString()} {inv.currency} ·{" "}
                    {format(inv.issuedAt, "d MMM yyyy", { locale: th })}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
              <TableCard
                minWidthClassName="min-w-[560px]"
                header={
                  <Toolbar
                    actions={
                      <span className="text-xs text-muted">{invoices.length} รายการล่าสุด</span>
                    }
                  >
                    <span className="text-[13px] font-medium text-ink">ใบแจ้งหนี้</span>
                  </Toolbar>
                }
              >
                <Table>
                  <THead>
                    <Th>รายการ</Th>
                    <Th align="right">จำนวน</Th>
                    <Th>สถานะ</Th>
                    <Th align="right">วันที่ออก</Th>
                  </THead>
                  <TBody>
                    {invoices.map((inv) => (
                      <Tr key={inv.id}>
                        <Td className="font-medium text-ink">{inv.description}</Td>
                        <Td align="right" className="tabular">
                          {inv.amount.toLocaleString()} {inv.currency}
                        </Td>
                        <Td>
                          <Badge tone={invoiceStatusTone(inv.status)} dot>
                            {invoiceStatusLabel(inv.status)}
                          </Badge>
                        </Td>
                        <Td align="right" className="text-muted">
                          {format(inv.issuedAt, "d MMM yyyy", { locale: th })}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

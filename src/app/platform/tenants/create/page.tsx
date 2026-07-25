import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePlatformSession } from "@/lib/auth";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { CreateTenantForm } from "./tenant-form";

export default async function PlatformCreateTenantPage() {
  const session = await requirePlatformSession();
  if (!session || session.role !== "super_admin") redirect("/platform/tenants");

  const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Tenants"
        title="สร้างองค์กรใหม่"
        description="กำหนดแพ็กเกจ ความจุจัดเก็บ และสร้างบัญชี Tenant Admin เริ่มต้น"
        actions={
          <ButtonLink href="/platform/tenants" variant="ghost" icon={ArrowLeft}>
            กลับ
          </ButtonLink>
        }
      />

      <Card className="p-6 sm:p-8">
        <CreateTenantForm plans={plans} />
      </Card>
    </div>
  );
}

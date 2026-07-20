import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePlatformSession } from "@/lib/auth";
import { PageHeader, Button, Card } from "@/components/ui";
import Link from "next/link";
import { CreateTenantForm } from "./tenant-form";

export default async function PlatformCreateTenantPage() {
  const session = await requirePlatformSession();
  if (!session || session.role !== "super_admin") redirect("/platform/tenants");

  const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } });

  return (
    <div>
      <PageHeader
        title="สร้างองค์กร (Tenant)"
        description="กำหนดแผนราคา/ความจุจัดเก็บ และสร้าง Tenant Admin เริ่มต้น"
        actions={
          <Link href="/platform/tenants">
            <Button variant="secondary">กลับ</Button>
          </Link>
        }
      />

      <Card>
        <CreateTenantForm plans={plans} />
      </Card>
    </div>
  );
}


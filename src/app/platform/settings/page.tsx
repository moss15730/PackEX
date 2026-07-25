import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlatformSettings } from "@/lib/platform-settings";
import { PlatformSettingsForm } from "@/components/platform-settings-form";

export const dynamic = "force-dynamic";

export default async function PlatformSettingsPage() {
  const session = await requirePlatformSession();
  if (!session) redirect("/login?platform=1");

  const [settings, plans] = await Promise.all([
    getPlatformSettings(),
    prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" },
      select: { id: true, nameTh: true, maxStations: true, maxStorageGb: true, maxUsers: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="ตั้งค่าแพลตฟอร์ม"
        description="กำหนดว่าองค์กรที่สมัครเองจะได้ทดลองใช้นานแค่ไหนและใช้ทรัพยากรได้เท่าไร"
      />

      <PlatformSettingsForm
        initial={settings}
        plans={plans}
        canManage={session.role === "super_admin"}
      />
    </div>
  );
}

import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { SettingsTheme } from "../theme-toggle";

export default async function ThemeSettingsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId) return null;

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: session.tenantId },
  });

  if (!settings) return null;

  return (
    <div>
      <PageHeader
        title="ธีม"
        description="เลือกโหมดการแสดงผลของแอปสำหรับอุปกรณ์นี้"
      />
      <Card className="max-w-2xl">
        <SettingsTheme defaultTheme={settings.theme} />
      </Card>
    </div>
  );
}

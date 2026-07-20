import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
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
      <PageHeader title="ธีม" description="ปรับโหมดการแสดงผลของแอป" />
      <Card className="max-w-xl">
        <p className="mb-4 text-sm text-[var(--muted)]">
          ค่าเริ่มต้นองค์กร: {settings.theme}
        </p>
        <SettingsTheme defaultTheme={settings.theme} />
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { OrganizationSettingsForm } from "@/components/organization-settings-form";
import { DataRequestPanel } from "@/components/data-request-panel";

export default async function OrganizationSettingsPage() {
  const session = await requireTenantSession();
  if (!session?.tenantId || !session.tenantSlug) return null;

  if (session.role !== "tenant_admin") {
    redirect(`/t/${session.tenantSlug}/dashboard`);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      name: true,
      slug: true,
      locale: true,
      timezone: true,
      status: true,
      settings: {
        select: {
          overlayEnabled: true,
          snapshotRequired: true,
          minRecordingSeconds: true,
          minCameras: true,
          idleAutoStopMinutes: true,
          softDeleteDays: true,
          videoPreset: true,
          consentRequired: true,
        },
      },
    },
  });

  if (!tenant) return null;

  const dataRequests = await prisma.dataRequest.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const policy = {
    overlayEnabled: tenant.settings?.overlayEnabled ?? true,
    snapshotRequired: tenant.settings?.snapshotRequired ?? true,
    minRecordingSeconds: tenant.settings?.minRecordingSeconds ?? 15,
    minCameras: tenant.settings?.minCameras ?? 1,
    idleAutoStopMinutes: tenant.settings?.idleAutoStopMinutes ?? 10,
    softDeleteDays: tenant.settings?.softDeleteDays ?? 14,
    videoPreset: tenant.settings?.videoPreset ?? "standard",
    consentRequired: tenant.settings?.consentRequired ?? true,
  };

  return (
    <div>
      <PageHeader
        title="ข้อมูลองค์กร"
        description="จัดการรายละเอียดองค์กรและนโยบายการอัดหลักฐาน"
      />
      <OrganizationSettingsForm
        tenant={tenant}
        tenantSlug={session.tenantSlug}
        policy={policy}
      />

      <div className="mx-auto mt-5 max-w-3xl">
        <DataRequestPanel
          tenantSlug={session.tenantSlug}
          requests={dataRequests.map((r) => ({
            id: r.id,
            type: r.type,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}

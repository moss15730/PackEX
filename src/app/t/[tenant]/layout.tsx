import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenantSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ReadOnlyBanner, ReadOnlyProvider } from "@/components/read-only-provider";
import { SupportChatWidget } from "@/components/support-chat-widget";
import { getTenantAccess, readOnlyMessage } from "@/lib/tenant-access";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/** Tenant data is per-request and must never be prerendered or shared. */
export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();
  if (!session) redirect("/login");

  if (session.tenantSlug !== tenantSlug) {
    redirect(`/t/${session.tenantSlug}/dashboard`);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { status: true },
  });

  if (tenant?.status === "suspended") {
    redirect("/suspended");
  }

  const access = await getTenantAccess(session.tenantId!);

  return (
    <ReadOnlyProvider
      value={{
        readOnly: !access.canWrite,
        reason: access.reason,
        message: readOnlyMessage(access.reason),
        trialDaysLeft: access.trialDaysLeft,
      }}
    >
      <AppShell tenantSlug={tenantSlug} userName={session.name} userRole={session.role}>
        <ReadOnlyBanner />
        {children}
        <SupportChatWidget tenantSlug={tenantSlug} userName={session.name} />
      </AppShell>
    </ReadOnlyProvider>
  );
}

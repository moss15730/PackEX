import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenantSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

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

  return (
    <AppShell tenantSlug={tenantSlug} userName={session.name} userRole={session.role}>
      {children}
    </AppShell>
  );
}

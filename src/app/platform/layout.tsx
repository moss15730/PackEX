import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePlatformSession } from "@/lib/auth";
import { PlatformShell } from "@/components/platform-shell";

export const metadata: Metadata = {
  title: { default: "Platform console", template: "%s | PackEX Platform" },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Every screen here reads live operational data for a signed-in admin.
 * Rendering per request keeps builds independent of the database and stops
 * one admin's data being cached for another.
 */
export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePlatformSession();
  if (!session) redirect("/login?platform=1");

  return (
    <PlatformShell userName={session.name} userRole={session.role}>
      {children}
    </PlatformShell>
  );
}

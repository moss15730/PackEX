"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, LogOut } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { MobileShellLayout } from "@/components/mobile-shell-layout";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui";
import { cn, roleLabel } from "@/lib/utils";

const NAV: { href: string; label: string; exact?: boolean; mobileTitle?: string }[] = [
  { href: "/platform", label: "ภาพรวม", exact: true, mobileTitle: "ภาพรวม" },
  { href: "/platform/tenants", label: "Tenants", mobileTitle: "Tenants" },
  { href: "/platform/plans", label: "แผน", mobileTitle: "แผน" },
  { href: "/platform/usage", label: "Usage", mobileTitle: "Usage" },
  { href: "/platform/health", label: "สุขภาพระบบ", mobileTitle: "สุขภาพระบบ" },
  { href: "/platform/support", label: "Support Grants", mobileTitle: "Support" },
  { href: "/platform/announcements", label: "ประกาศ", mobileTitle: "ประกาศ" },
  { href: "/platform/data-requests", label: "Data Requests", mobileTitle: "Data Requests" },
];

export function PlatformShell({
  userName,
  userRole,
  children,
}: {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolved, setTheme } = useTheme();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login?platform=1");
    router.refresh();
  }

  const mobileTitle =
    NAV.find((item) =>
      item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.mobileTitle ?? "Platform";

  return (
    <MobileShellLayout
      mobileTitle={mobileTitle}
      sidebarHeader={
        <>
          <Link href="/platform">
            <PackExWordmark />
          </Link>
          <p className="mt-2 text-xs uppercase tracking-wide text-[var(--muted)]">Platform Console</p>
        </>
      }
      sidebarNav={
        <>
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "mb-0.5 block rounded-lg px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-[var(--accent)]/15 font-medium text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </>
      }
      sidebarFooter={
        <>
          <div className="mb-2 truncate text-sm font-medium text-[var(--ink)]">{userName}</div>
          <div className="mb-3 text-xs text-[var(--muted)]">{roleLabel(userRole)}</div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="flex-1 px-2"
              onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
              aria-label="สลับธีม"
            >
              {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button variant="ghost" className="flex-1 px-2" onClick={logout} aria-label="ออกจากระบบ">
              <LogOut size={16} />
            </Button>
          </div>
        </>
      }
    >
      {children}
    </MobileShellLayout>
  );
}

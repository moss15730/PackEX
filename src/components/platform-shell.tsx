"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Building2,
  Package,
  Activity,
  HeartPulse,
  LifeBuoy,
  Megaphone,
  Database,
  Moon,
  Sun,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { MobileShellLayout } from "@/components/mobile-shell-layout";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui";
import { cn, roleLabel } from "@/lib/utils";

const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  mobileTitle?: string;
}[] = [
  { href: "/platform", label: "ภาพรวม", icon: LayoutGrid, exact: true, mobileTitle: "ภาพรวม" },
  { href: "/platform/tenants", label: "Tenants", icon: Building2, mobileTitle: "Tenants" },
  { href: "/platform/plans", label: "แผน", icon: Package, mobileTitle: "แผน" },
  { href: "/platform/usage", label: "Usage", icon: Activity, mobileTitle: "Usage" },
  { href: "/platform/health", label: "สุขภาพระบบ", icon: HeartPulse, mobileTitle: "สุขภาพระบบ" },
  { href: "/platform/support", label: "Support Grants", icon: LifeBuoy, mobileTitle: "Support" },
  { href: "/platform/announcements", label: "ประกาศ", icon: Megaphone, mobileTitle: "ประกาศ" },
  {
    href: "/platform/data-requests",
    label: "Data Requests",
    icon: Database,
    mobileTitle: "Data Requests",
  },
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
          <p className="mt-2 rounded-md bg-[var(--surface-2)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Platform Console
          </p>
        </>
      }
      sidebarNav={
        <>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Platform
          </p>
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "mb-0.5 flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm transition duration-150",
                  active
                    ? "nav-item-active"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.25 : 1.9} className="shrink-0 opacity-90" />
                {item.label}
              </Link>
            );
          })}
        </>
      }
      sidebarFooter={
        <>
          <div className="mb-0.5 truncate text-sm font-semibold text-[var(--ink)]">{userName}</div>
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

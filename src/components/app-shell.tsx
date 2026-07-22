"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  Film,
  FileWarning,
  ClipboardList,
  Bell,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { MobileShellLayout } from "@/components/mobile-shell-layout";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui";
import { can, type Permission } from "@/lib/permissions";
import { cn, roleLabel } from "@/lib/utils";

const NAV_TOP: {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  roles?: string[];
}[] = [
  { href: "dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  {
    href: "station",
    label: "เลือกสถานี",
    icon: Camera,
    permission: "recording.start",
  },
  { href: "videos", label: "วิดีโอ", icon: Film, permission: "video.view" },
  {
    href: "claims",
    label: "เคลม",
    icon: FileWarning,
    permission: "claims.manage",
  },
  {
    href: "audit",
    label: "Audit",
    icon: ClipboardList,
    permission: "audit.view",
  },
  {
    href: "alerts",
    label: "แจ้งเตือน",
    icon: Bell,
    roles: ["tenant_admin", "supervisor"],
  },
  {
    href: "reports",
    label: "รายงาน",
    icon: BarChart3,
    permission: "audit.view",
  },
];

const SETTINGS_SUB = [
  { href: "settings/organization", label: "ข้อมูลองค์กร", roles: ["tenant_admin"] },
  {
    href: "settings/stations",
    label: "จัดการสถานี",
    roles: ["tenant_admin", "supervisor"],
  },
  {
    href: "settings/claim-reasons",
    label: "เหตุผลเคลม",
    roles: ["tenant_admin", "supervisor"],
  },
  { href: "settings/employees", label: "พนักงาน", roles: ["tenant_admin"] },
  {
    href: "settings/billing",
    label: "แพ็กเกจและการใช้งาน",
    roles: ["tenant_admin"],
  },
  {
    href: "settings/theme",
    label: "ธีม",
    roles: ["tenant_admin", "supervisor"],
  },
] as const;

const NAV_BOTTOM: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "help", label: "ช่วยเหลือ", icon: HelpCircle },
];

const PAGE_TITLES: Record<string, string> = {
  dashboard: "แดชบอร์ด",
  station: "เลือกสถานี",
  videos: "วิดีโอ",
  claims: "เคลม",
  audit: "Audit",
  alerts: "แจ้งเตือน",
  reports: "รายงาน",
  help: "ช่วยเหลือ",
  settings: "ตั้งค่า",
  onboarding: "เริ่มต้นใช้งาน",
};

function NavLink({
  href,
  label,
  active,
  nested,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  nested?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-0.5 flex items-center gap-2.5 rounded-[var(--radius-sm)] py-2.5 text-sm transition duration-150",
        nested ? "px-3 pl-9" : "px-3",
        active
          ? "nav-item-active"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
      )}
    >
      {Icon ? <Icon size={17} strokeWidth={active ? 2.25 : 1.9} className="shrink-0 opacity-90" /> : null}
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({
  tenantSlug,
  userName,
  userRole,
  children,
}: {
  tenantSlug: string;
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolved, setTheme } = useTheme();
  const base = `/t/${tenantSlug}`;
  const settingsActive = pathname.startsWith(`${base}/settings`);
  const [settingsPinned, setSettingsPinned] = useState(false);
  const settingsOpen = settingsActive || settingsPinned;

  const visibleNav = NAV_TOP.filter((item) => {
    if (item.permission && !can(userRole, item.permission)) return false;
    if (item.roles && !item.roles.includes(userRole)) return false;
    return true;
  });

  const visibleSettings = SETTINGS_SUB.filter((item) =>
    (item.roles as readonly string[]).includes(userRole),
  );
  const showSettings = visibleSettings.length > 0;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    const full = `${base}/${href}`;
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  const mobileTitle =
    pathname.includes("/station/") && pathname !== `${base}/station`
      ? "Station Console"
      : PAGE_TITLES[pathname.replace(`${base}/`, "").split("/")[0] ?? ""] ?? tenantSlug;

  const isStationConsole =
    pathname.includes("/station/") && pathname !== `${base}/station`;

  const sidebarFooter = (
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
  );

  return (
    <MobileShellLayout
      mobileTitle={mobileTitle}
      mainClassName={
        isStationConsole
          ? "flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:p-4"
          : undefined
      }
      sidebarHeader={
        <>
          <Link href={`${base}/dashboard`}>
            <PackExWordmark />
          </Link>
          <p className="mt-2 truncate rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium text-[var(--muted)]">
            {tenantSlug}
          </p>
        </>
      }
      sidebarNav={
        <>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            เมนูหลัก
          </p>
          {visibleNav.map((item) => (
            <NavLink
              key={item.href}
              href={`${base}/${item.href}`}
              label={item.label}
              active={isActive(item.href)}
              icon={item.icon}
            />
          ))}

          {showSettings && (
            <div className="mb-0.5 mt-3">
              <button
                type="button"
                onClick={() => setSettingsPinned((o) => !o)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2.5 text-sm transition",
                  settingsActive
                    ? "nav-item-active"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
                )}
                aria-expanded={settingsOpen}
              >
                <span className="flex items-center gap-2.5">
                  <Settings size={17} strokeWidth={settingsActive ? 2.25 : 1.9} />
                  ตั้งค่า
                </span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "shrink-0 transition-transform",
                    settingsOpen ? "rotate-0" : "-rotate-90",
                  )}
                />
              </button>
              {settingsOpen && (
                <div className="mt-0.5">
                  {visibleSettings.map((item) => (
                    <NavLink
                      key={item.href}
                      href={`${base}/${item.href}`}
                      label={item.label}
                      active={pathname === `${base}/${item.href}`}
                      nested
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-3">
            {NAV_BOTTOM.map((item) => (
              <NavLink
                key={item.href}
                href={`${base}/${item.href}`}
                label={item.label}
                active={isActive(item.href)}
                icon={item.icon}
              />
            ))}
          </div>
        </>
      }
      sidebarFooter={sidebarFooter}
    >
      {children}
    </MobileShellLayout>
  );
}

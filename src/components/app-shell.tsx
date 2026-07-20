"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Moon, Sun, LogOut } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui";
import { cn, roleLabel } from "@/lib/utils";

const NAV_TOP = [
  { href: "dashboard", label: "แดชบอร์ด" },
  { href: "station", label: "เลือกสถานี" },
  { href: "videos", label: "วิดีโอ" },
  { href: "claims", label: "เคลม" },
  { href: "audit", label: "Audit" },
  { href: "alerts", label: "แจ้งเตือน" },
  { href: "reports", label: "รายงาน" },
] as const;

const SETTINGS_SUB = [
  { href: "settings/organization", label: "ข้อมูลองค์กร" },
  { href: "settings/stations", label: "จัดการสถานี" },
  { href: "settings/claim-reasons", label: "เหตุผลเคลม" },
  { href: "settings/employees", label: "พนักงาน" },
  { href: "settings/billing", label: "แพ็กเกจและการใช้งาน" },
  { href: "settings/theme", label: "ธีม" },
] as const;

const NAV_BOTTOM = [{ href: "help", label: "ช่วยเหลือ" }] as const;

function NavLink({
  href,
  label,
  active,
  nested,
}: {
  href: string;
  label: string;
  active: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-0.5 block rounded-lg py-2 text-sm transition",
        nested ? "px-3 pl-8" : "px-3",
        active
          ? "bg-[var(--accent)]/15 font-medium text-[var(--ink)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
      )}
    >
      {label}
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
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);

  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [settingsActive]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    const full = `${base}/${href}`;
    if (href === "station") {
      return pathname === full || pathname.startsWith(`${full}/`);
    }
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-4">
          <Link href={`${base}/dashboard`}>
            <PackExWordmark />
          </Link>
          <p className="mt-2 truncate text-xs text-[var(--muted)]">{tenantSlug}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {NAV_TOP.map((item) => (
            <NavLink
              key={item.href}
              href={`${base}/${item.href}`}
              label={item.label}
              active={isActive(item.href)}
            />
          ))}

          {userRole === "tenant_admin" && (
            <div className="mb-0.5">
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                  settingsActive
                    ? "bg-[var(--accent)]/10 font-medium text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
                )}
                aria-expanded={settingsOpen}
              >
                <span>ตั้งค่า</span>
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
                  {SETTINGS_SUB.map((item) => (
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

          {NAV_BOTTOM.map((item) => (
            <NavLink
              key={item.href}
              href={`${base}/${item.href}`}
              label={item.label}
              active={isActive(item.href)}
            />
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
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
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}

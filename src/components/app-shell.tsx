"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, LogOut } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui";
import { cn, roleLabel } from "@/lib/utils";

const NAV = [
  { href: "dashboard", label: "แดชบอร์ด" },
  { href: "station", label: "Station Console" },
  { href: "stations", label: "สถานี" },
  { href: "videos", label: "วิดีโอ" },
  { href: "claims", label: "เคลม" },
  { href: "employees", label: "พนักงาน" },
  { href: "audit", label: "Audit" },
  { href: "alerts", label: "แจ้งเตือน" },
  { href: "reports", label: "รายงาน" },
  { href: "settings", label: "ตั้งค่า" },
  { href: "billing", label: "แพ็กเกจ" },
  { href: "help", label: "ช่วยเหลือ" },
] as const;

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
          {NAV.map((item) => {
            const href = `${base}/${item.href}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "mb-0.5 block rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-[var(--accent)]/15 font-medium text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
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

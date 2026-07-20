"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, LogOut } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui";
import { cn, roleLabel } from "@/lib/utils";

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/platform", label: "ภาพรวม", exact: true },
  { href: "/platform/tenants", label: "Tenants" },
  { href: "/platform/plans", label: "แผน" },
  { href: "/platform/usage", label: "Usage" },
  { href: "/platform/health", label: "สุขภาพระบบ" },
  { href: "/platform/support", label: "Support Grants" },
  { href: "/platform/announcements", label: "ประกาศ" },
  { href: "/platform/data-requests", label: "Data Requests" },
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

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-4">
          <Link href="/platform">
            <PackExWordmark />
          </Link>
          <p className="mt-2 text-xs uppercase tracking-wide text-[var(--muted)]">Platform Console</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
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
            >
              {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button variant="ghost" className="flex-1 px-2" onClick={logout}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}

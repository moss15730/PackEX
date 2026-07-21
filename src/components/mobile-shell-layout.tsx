"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

export function MobileShellLayout({
  mobileTitle,
  sidebarHeader,
  sidebarNav,
  sidebarFooter,
  children,
  mainClassName,
}: {
  mobileTitle: ReactNode;
  sidebarHeader: ReactNode;
  sidebarNav: ReactNode;
  sidebarFooter: ReactNode;
  children: ReactNode;
  mainClassName?: string;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col lg:flex-row">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 py-3 backdrop-blur-md lg:hidden">
        <Button
          type="button"
          variant="ghost"
          className="px-2"
          onClick={() => setNavOpen(true)}
          aria-label="เปิดเมนู"
        >
          <Menu size={22} />
        </Button>
        <div className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[var(--ink)]">
          {mobileTitle}
        </div>
        <div className="w-10" aria-hidden />
      </header>

      {navOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] animate-[backdrop-in_160ms_ease-out] lg:hidden"
          aria-label="ปิดเมนู"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(100vw,17rem)] flex-col border-r border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] p-4">
          <div className="min-w-0 flex-1 animate-[shell-slide_280ms_ease-out]">{sidebarHeader}</div>
          <Button
            type="button"
            variant="ghost"
            className="ml-2 shrink-0 px-2 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="ปิดเมนู"
          >
            <X size={20} />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2.5" onClick={() => setNavOpen(false)}>
          {sidebarNav}
        </nav>

        <div className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_55%,var(--surface))] p-3">
          {sidebarFooter}
        </div>
      </aside>

      <main
        className={cn(
          "page-enter min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8",
          mainClassName?.includes("overflow-hidden")
            ? "overflow-hidden"
            : "overflow-y-auto",
          mainClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}

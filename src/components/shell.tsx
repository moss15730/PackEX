"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Avatar } from "@/components/ui";
import { cn, roleLabel } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  children?: { href: string; label: string }[];
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

function isPathActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* --------------------------------------------------------------------------
   Sidebar pieces
   -------------------------------------------------------------------------- */

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  nested,
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg text-[13.5px] transition-colors duration-150",
        nested ? "py-1.5 pr-3 pl-10" : "px-2.5 py-2",
        active
          ? "bg-brand-soft font-medium text-brand-soft-ink"
          : "text-ink-2 hover:bg-subtle hover:text-ink",
      )}
    >
      {Icon ? (
        <Icon
          size={17}
          strokeWidth={active ? 2.2 : 1.85}
          className={cn("shrink-0", active ? "text-brand" : "text-muted group-hover:text-ink-2")}
        />
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const groupActive = isPathActive(pathname, item.href);
  const [pinned, setPinned] = useState(false);
  const open = groupActive || pinned;
  const Icon = item.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setPinned((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13.5px] transition-colors duration-150",
          groupActive
            ? "font-medium text-ink"
            : "text-ink-2 hover:bg-subtle hover:text-ink",
        )}
      >
        <span className="flex items-center gap-2.5">
          <Icon
            size={17}
            strokeWidth={groupActive ? 2.2 : 1.85}
            className={cn(groupActive ? "text-brand" : "text-muted")}
          />
          {item.label}
        </span>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-faint transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="relative mt-0.5 space-y-0.5 pb-1">
            <span
              className="absolute top-1 bottom-1 left-[1.35rem] w-px bg-line"
              aria-hidden
            />
            {item.children?.map((child) => (
              <SidebarLink
                key={child.href}
                href={child.href}
                label={child.label}
                active={pathname === child.href}
                nested
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   App frame
   -------------------------------------------------------------------------- */

export function AppFrame({
  brand,
  contextLabel,
  sections,
  footerSection,
  mobileTabs,
  user,
  onLogout,
  title,
  children,
  fullHeight = false,
  contentClassName,
}: {
  brand: ReactNode;
  contextLabel?: ReactNode;
  sections: NavSection[];
  footerSection?: NavSection;
  mobileTabs?: NavItem[];
  user: { name: string; role: string };
  onLogout: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Station console fills the viewport instead of scrolling the page. */
  fullHeight?: boolean;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const { resolved, setTheme } = useTheme();
  /** Open only while the path matches the one it was opened on — auto-closes on navigate. */
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const drawerOpen = openForPath === pathname;

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const closeDrawer = () => setOpenForPath(null);
  const openDrawer = () => setOpenForPath(pathname);

  const nav = (
    <>
      {sections.map((section, i) => (
        <div key={i} className={cn(i > 0 && "mt-6")}>
          {section.title ? (
            <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold tracking-[0.14em] text-faint uppercase">
              {section.title}
            </p>
          ) : null}
          <div className="space-y-0.5">
            {section.items.map((item) =>
              item.children ? (
                <SidebarGroup
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={closeDrawer}
                />
              ) : (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isPathActive(pathname, item.href, item.exact)}
                  onNavigate={closeDrawer}
                />
              ),
            )}
          </div>
        </div>
      ))}

      {footerSection ? (
        <div className="mt-6 border-t border-line pt-4">
          <div className="space-y-0.5">
            {footerSection.items.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isPathActive(pathname, item.href, item.exact)}
                onNavigate={closeDrawer}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );

  const sidebarInner = (
    <>
      <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-4">
        <div className="min-w-0">
          {brand}
          {contextLabel ? (
            <div className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-md bg-subtle px-2 py-1 text-[11px] font-medium text-muted ring-1 ring-line/60">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span className="truncate">{contextLabel}</span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="ปิดเมนู"
          className="rounded-md p-1.5 text-muted transition hover:bg-subtle hover:text-ink lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">{nav}</nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <Avatar name={user.name} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-ink">{user.name}</div>
            <div className="truncate text-[11px] text-muted">{roleLabel(user.role)}</div>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
              aria-label={resolved === "dark" ? "ใช้ธีมสว่าง" : "ใช้ธีมมืด"}
              className="rounded-md p-1.5 text-muted transition hover:bg-subtle hover:text-ink"
            >
              {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="ออกจากระบบ"
              className="rounded-md p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger-ink"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-[100dvh] bg-canvas">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-[var(--sidebar-w)] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            style={{ animation: "fade-in 160ms var(--ease-out) both" }}
            onClick={closeDrawer}
            aria-hidden
          />
          <aside
            className="relative flex h-full w-[min(86vw,17.5rem)] flex-col border-r border-line bg-surface shadow-xl"
            style={{ animation: "slide-in-left 220ms var(--ease-out) both" }}
          >
            {sidebarInner}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line px-3 lg:hidden">
          <button
            type="button"
            onClick={openDrawer}
            aria-label="เปิดเมนู"
            className="rounded-md p-2 text-ink-2 transition hover:bg-subtle hover:text-ink"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-ink">
            {title}
          </div>
          <button
            type="button"
            onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            aria-label={resolved === "dark" ? "ใช้ธีมสว่าง" : "ใช้ธีมมืด"}
            className="rounded-md p-2 text-ink-2 transition hover:bg-subtle hover:text-ink"
          >
            {resolved === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main
          className={cn(
            "page-enter min-w-0 flex-1",
            fullHeight
              ? "flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden p-3 sm:p-4 lg:h-[100dvh]"
              : "px-4 pt-6 pb-24 sm:px-6 sm:pb-10 lg:px-10 lg:pt-10",
            contentClassName,
          )}
        >
          {fullHeight ? children : <div className="mx-auto w-full max-w-[86rem]">{children}</div>}
        </main>

        {/* Mobile bottom tabs */}
        {mobileTabs && mobileTabs.length > 0 && !fullHeight ? (
          <nav
            className="glass fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line pb-[env(safe-area-inset-bottom)] sm:hidden"
            aria-label="เมนูหลัก"
          >
            {mobileTabs.map((tab) => {
              const active = isPathActive(pathname, tab.href, tab.exact);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                    active ? "text-brand" : "text-muted",
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="truncate px-1">{tab.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={openDrawer}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted"
            >
              <MoreHorizontal size={20} strokeWidth={1.8} />
              <span>เพิ่มเติม</span>
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

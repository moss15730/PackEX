"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SettingsTab = { href: string; label: string };

/** Horizontal section nav for the settings area — scrolls on small screens. */
export function SettingsNav({ tabs }: { tabs: SettingsTab[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ส่วนตั้งค่า"
      className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
    >
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative block px-3 py-2.5 text-[13.5px] font-medium whitespace-nowrap transition-colors",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {tab.label}
                {active ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

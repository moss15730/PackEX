"use client";

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
  type LucideIcon,
} from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { AppFrame, type NavItem, type NavSection } from "@/components/shell";
import { can, type Permission } from "@/lib/permissions";

type Entry = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  roles?: string[];
};

const OPERATE: Entry[] = [
  { href: "dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "station", label: "สถานีแพ็ค", icon: Camera, permission: "recording.start" },
  { href: "videos", label: "วิดีโอ", icon: Film, permission: "video.view" },
  { href: "claims", label: "เคลม", icon: FileWarning, permission: "claims.manage" },
];

const ANALYZE: Entry[] = [
  { href: "reports", label: "รายงาน", icon: BarChart3, permission: "audit.view" },
  { href: "alerts", label: "แจ้งเตือน", icon: Bell, roles: ["tenant_admin", "supervisor"] },
  { href: "audit", label: "Audit log", icon: ClipboardList, permission: "audit.view" },
];

const SETTINGS_SUB = [
  { href: "settings/organization", label: "ข้อมูลองค์กร", roles: ["tenant_admin"] },
  { href: "settings/stations", label: "จัดการสถานี", roles: ["tenant_admin", "supervisor"] },
  { href: "settings/claim-reasons", label: "เหตุผลเคลม", roles: ["tenant_admin", "supervisor"] },
  { href: "settings/employees", label: "พนักงาน", roles: ["tenant_admin"] },
  { href: "settings/billing", label: "แพ็กเกจและการใช้งาน", roles: ["tenant_admin"] },
  { href: "settings/theme", label: "ธีม", roles: ["tenant_admin", "supervisor"] },
] as const;

const PAGE_TITLES: Record<string, string> = {
  dashboard: "แดชบอร์ด",
  station: "สถานีแพ็ค",
  videos: "วิดีโอ",
  claims: "เคลม",
  audit: "Audit log",
  alerts: "แจ้งเตือน",
  reports: "รายงาน",
  help: "ช่วยเหลือ",
  settings: "ตั้งค่า",
  onboarding: "เริ่มต้นใช้งาน",
  stations: "สถานี",
  billing: "แพ็กเกจ",
};

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
  const base = `/t/${tenantSlug}`;

  const allowed = (entry: Entry) => {
    if (entry.permission && !can(userRole, entry.permission)) return false;
    if (entry.roles && !entry.roles.includes(userRole)) return false;
    return true;
  };

  const toNav = (entries: Entry[]): NavItem[] =>
    entries.filter(allowed).map((entry) => ({
      href: `${base}/${entry.href}`,
      label: entry.label,
      icon: entry.icon,
    }));

  const operate = toNav(OPERATE);
  const analyze = toNav(ANALYZE);

  const visibleSettings = SETTINGS_SUB.filter((item) =>
    (item.roles as readonly string[]).includes(userRole),
  ).map((item) => ({ href: `${base}/${item.href}`, label: item.label }));

  const sections: NavSection[] = [{ title: "ปฏิบัติการ", items: operate }];
  if (analyze.length > 0) sections.push({ title: "วิเคราะห์", items: analyze });
  if (visibleSettings.length > 0) {
    sections.push({
      title: "ระบบ",
      items: [
        {
          href: `${base}/settings`,
          label: "ตั้งค่า",
          icon: Settings,
          children: visibleSettings,
        },
      ],
    });
  }

  const footerSection: NavSection = {
    items: [{ href: `${base}/help`, label: "ช่วยเหลือ", icon: HelpCircle }],
  };

  const isStationConsole = pathname.includes("/station/") && pathname !== `${base}/station`;
  const segment = pathname.replace(`${base}/`, "").split("/")[0] ?? "";
  const title = isStationConsole ? "Station Console" : (PAGE_TITLES[segment] ?? tenantSlug);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <AppFrame
      brand={
        <Link href={`${base}/dashboard`} className="inline-flex">
          <PackExWordmark />
        </Link>
      }
      contextLabel={tenantSlug}
      sections={sections}
      footerSection={footerSection}
      mobileTabs={[...operate].slice(0, 4)}
      user={{ name: userName, role: userRole }}
      onLogout={logout}
      title={title}
      fullHeight={isStationConsole}
    >
      {children}
    </AppFrame>
  );
}

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
  ReceiptText,
  MessagesSquare,
  Settings,
} from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { AppFrame, type NavSection } from "@/components/shell";

const SECTIONS: NavSection[] = [
  {
    title: "ภาพรวม",
    items: [
      { href: "/platform", label: "ภาพรวม", icon: LayoutGrid, exact: true },
      { href: "/platform/usage", label: "การใช้งาน", icon: Activity },
      { href: "/platform/health", label: "สุขภาพระบบ", icon: HeartPulse },
    ],
  },
  {
    title: "ลูกค้า",
    items: [
      { href: "/platform/inbox", label: "กล่องข้อความ", icon: MessagesSquare },
      { href: "/platform/tenants", label: "Tenants", icon: Building2 },
      { href: "/platform/plans", label: "แผนบริการ", icon: Package },
      { href: "/platform/billing", label: "การเรียกเก็บเงิน", icon: ReceiptText },
      { href: "/platform/support", label: "Support grants", icon: LifeBuoy },
    ],
  },
  {
    title: "การกำกับดูแล",
    items: [
      { href: "/platform/announcements", label: "ประกาศ", icon: Megaphone },
      { href: "/platform/data-requests", label: "Data requests", icon: Database },
      { href: "/platform/settings", label: "ตั้งค่าแพลตฟอร์ม", icon: Settings },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/platform": "ภาพรวม",
  "/platform/tenants": "Tenants",
  "/platform/plans": "แผนบริการ",
  "/platform/inbox": "กล่องข้อความ",
  "/platform/settings": "ตั้งค่าแพลตฟอร์ม",
  "/platform/billing": "การเรียกเก็บเงิน",
  "/platform/usage": "การใช้งาน",
  "/platform/health": "สุขภาพระบบ",
  "/platform/support": "Support grants",
  "/platform/announcements": "ประกาศ",
  "/platform/data-requests": "Data requests",
};

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login?platform=1");
    router.refresh();
  }

  const title =
    Object.entries(TITLES)
      .filter(([href]) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "Platform";

  return (
    <AppFrame
      brand={
        <Link href="/platform" className="inline-flex">
          <PackExWordmark />
        </Link>
      }
      contextLabel="Platform console"
      sections={SECTIONS}
      user={{ name: userName, role: userRole }}
      onLogout={logout}
      title={title}
    >
      {children}
    </AppFrame>
  );
}

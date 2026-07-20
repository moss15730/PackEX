"use client";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui";

export function SettingsTheme({ defaultTheme }: { defaultTheme: string }) {
  const { theme, setTheme, resolved } = useTheme();

  return (
    <div className="flex flex-wrap gap-2">
      {(["light", "dark", "system"] as const).map((t) => (
        <Button
          key={t}
          variant={theme === t ? "primary" : "outline"}
          onClick={() => setTheme(t)}
        >
          {t === "light" ? "สว่าง" : t === "dark" ? "มืด" : "ตามระบบ"}
        </Button>
      ))}
      <p className="w-full text-xs text-[var(--muted)]">
        องค์กรตั้งค่า: {defaultTheme} · ปัจจุบัน: {resolved}
      </p>
    </div>
  );
}

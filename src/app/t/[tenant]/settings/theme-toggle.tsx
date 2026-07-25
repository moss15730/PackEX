"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "สว่าง", icon: Sun, description: "เหมาะกับพื้นที่ที่มีแสงมาก" },
  { value: "dark", label: "มืด", icon: Moon, description: "ถนอมสายตาในคลังที่แสงน้อย" },
  { value: "system", label: "ตามระบบ", icon: Monitor, description: "ปรับตามการตั้งค่าอุปกรณ์" },
] as const;

export function SettingsTheme({ defaultTheme }: { defaultTheme: string }) {
  const { theme, setTheme, resolved } = useTheme();

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = theme === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
              className={cn(
                "group relative rounded-xl border p-4 text-left transition duration-150",
                active
                  ? "border-brand bg-brand-soft/60 shadow-xs"
                  : "border-line bg-surface hover:border-line-strong hover:bg-subtle/60",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    active ? "bg-brand text-brand-ink" : "bg-subtle text-muted",
                  )}
                >
                  <Icon size={17} strokeWidth={1.9} />
                </span>
                {active ? <Check size={16} className="text-brand" strokeWidth={2.6} /> : null}
              </div>
              <p className="mt-3 text-sm font-medium text-ink">{option.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{option.description}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">
        ค่าเริ่มต้นองค์กร: <span className="font-medium text-ink-2">{defaultTheme}</span> · กำลังแสดงผล:{" "}
        <span className="font-medium text-ink-2">{resolved === "dark" ? "มืด" : "สว่าง"}</span>
      </p>
    </div>
  );
}

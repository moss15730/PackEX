"use client";

import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { AlertTriangle, Info, Siren } from "lucide-react";

type AlertItem = {
  id: string;
  severity: string;
  title: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
};

export function AlertsList({ alerts, tenantSlug }: { alerts: AlertItem[]; tenantSlug: string }) {
  const router = useRouter();
  const { toast } = useNotify();

  async function acknowledge(id: string) {
    const res = await fetch(`/api/t/${tenantSlug}/alerts/${id}`, { method: "PATCH" });
    if (!res.ok) {
      toast({ title: "รับทราบไม่สำเร็จ", tone: "danger" });
      return;
    }
    toast({ title: "รับทราบแล้ว", tone: "success" });
    router.refresh();
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-[var(--muted)]">ไม่มีแจ้งเตือน</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const tone =
          alert.severity === "critical"
            ? "danger"
            : alert.severity === "warning"
              ? "warning"
              : "info";
        const Icon =
          alert.severity === "critical"
            ? Siren
            : alert.severity === "warning"
              ? AlertTriangle
              : Info;
        const iconWrap =
          tone === "danger"
            ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
            : tone === "warning"
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "bg-sky-500/15 text-sky-600 dark:text-sky-300";

        return (
          <Card key={alert.id} className="flex flex-wrap items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${iconWrap}`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-[var(--ink)]">{alert.title}</h2>
                <Badge tone={tone}>{alert.severity}</Badge>
                {alert.acknowledged && <Badge tone="neutral">รับทราบแล้ว</Badge>}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{alert.message}</p>
              <time className="mt-2 block text-xs text-[var(--muted)]">
                {format(new Date(alert.createdAt), "d MMM yyyy HH:mm", { locale: th })}
              </time>
            </div>
            {!alert.acknowledged && (
              <Button variant="outline" className="text-xs" onClick={() => void acknowledge(alert.id)}>
                รับทราบ
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}

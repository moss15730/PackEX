"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BellOff, Check, Info, Siren } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type AlertItem = {
  id: string;
  severity: string;
  title: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
};

const severityMeta = {
  critical: { tone: "danger", icon: Siren, label: "วิกฤต" },
  warning: { tone: "warning", icon: AlertTriangle, label: "เตือน" },
  info: { tone: "info", icon: Info, label: "ข้อมูล" },
} as const;

function metaFor(severity: string) {
  return severityMeta[severity as keyof typeof severityMeta] ?? severityMeta.info;
}

export function AlertsList({ alerts, tenantSlug }: { alerts: AlertItem[]; tenantSlug: string }) {
  const router = useRouter();
  const { toast } = useNotify();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/alerts/${id}`, { method: "PATCH" });
      if (!res.ok) {
        toast({ title: "รับทราบไม่สำเร็จ", tone: "danger" });
        return;
      }
      toast({ title: "รับทราบแล้ว", tone: "success" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title="ไม่มีแจ้งเตือน"
        description="ทุกสถานีและอุปกรณ์ทำงานปกติ ระบบจะแจ้งทันทีเมื่อพบความผิดปกติ"
      />
    );
  }

  const pending = alerts.filter((a) => !a.acknowledged);
  const done = alerts.filter((a) => a.acknowledged);

  const renderAlert = (alert: AlertItem) => {
    const meta = metaFor(alert.severity);
    const Icon = meta.icon;
    return (
      <li
        key={alert.id}
        className={cn(
          "flex flex-wrap items-start gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5",
          alert.acknowledged && "opacity-70",
        )}
      >
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            meta.tone === "danger" && "bg-danger-soft text-danger-ink",
            meta.tone === "warning" && "bg-warning-soft text-warning-ink",
            meta.tone === "info" && "bg-info-soft text-info-ink",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-ink">{alert.title}</h3>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {alert.acknowledged ? <Badge icon={Check}>รับทราบแล้ว</Badge> : null}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{alert.message}</p>
          <time className="mt-2 block text-xs text-faint">
            {format(new Date(alert.createdAt), "d MMM yyyy HH:mm", { locale: th })}
          </time>
        </div>

        {!alert.acknowledged && (
          <Button
            variant="secondary"
            size="sm"
            icon={Check}
            loading={busyId === alert.id}
            onClick={() => void acknowledge(alert.id)}
          >
            รับทราบ
          </Button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-8">
      {pending.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[13px] font-semibold tracking-[0.1em] text-muted uppercase">
            ต้องดำเนินการ · {pending.length}
          </h2>
          <ul className="space-y-3">{pending.map(renderAlert)}</ul>
        </section>
      ) : null}

      {done.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[13px] font-semibold tracking-[0.1em] text-muted uppercase">
            รับทราบแล้ว · {done.length}
          </h2>
          <ul className="space-y-3">{done.map(renderAlert)}</ul>
        </section>
      ) : null}
    </div>
  );
}

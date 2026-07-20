"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { statusLabel } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export type VideoListItem = {
  id: string;
  orderNo: string;
  stationCode: string;
  status: string;
  completenessScore: number;
  startedAt: string;
  employeeName: string;
  videoCount: number;
};

export function VideosList({
  tenantSlug,
  initialQ,
  items,
}: {
  tenantSlug: string;
  initialQ: string;
  items: VideoListItem[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed === (initialQ || "").trim()) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (trimmed) params.set("q", trimmed);
      const qs = params.toString();
      startTransition(() => {
        router.replace(`/t/${tenantSlug}/videos${qs ? `?${qs}` : ""}`);
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [q, initialQ, router, tenantSlug]);

  function openVideo(id: string) {
    router.push(`/t/${tenantSlug}/videos/${id}`);
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาเลขออเดอร์…"
          autoComplete="off"
          className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        {isPending && (
          <p className="mt-1 text-xs text-[var(--muted)]">กำลังค้นหา…</p>
        )}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">ออเดอร์</th>
              <th className="px-4 py-3 font-medium">สถานี</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">ครบถ้วน</th>
              <th className="px-4 py-3 font-medium">เวลา</th>
              <th className="px-4 py-3 font-medium">พนักงาน</th>
            </tr>
          </thead>
          <tbody>
            {items.map((rec) => (
              <tr
                key={rec.id}
                role="link"
                tabIndex={0}
                onClick={() => openVideo(rec.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openVideo(rec.id);
                  }
                }}
                className="cursor-pointer border-b border-[var(--border)] last:border-0 transition hover:bg-[var(--surface-2)]"
              >
                <td className="px-4 py-3 font-medium text-[var(--accent)]">
                  <span>{rec.orderNo}</span>
                  {rec.videoCount > 1 && (
                    <Badge tone="neutral" className="ml-2 align-middle">
                      {rec.videoCount} วิดีโอ
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">{rec.stationCode}</td>
                <td className="px-4 py-3">
                  <Badge tone={rec.status === "ready" ? "success" : "neutral"}>
                    {statusLabel(rec.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      rec.completenessScore >= 80 ? "text-emerald-600" : "text-amber-600"
                    }
                  >
                    {rec.completenessScore}%
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {format(new Date(rec.startedAt), "d MMM HH:mm", { locale: th })}
                </td>
                <td className="px-4 py-3">{rec.employeeName}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="px-4 py-8 text-center text-[var(--muted)]">ไม่พบวิดีโอ</p>
        )}
      </Card>
    </div>
  );
}

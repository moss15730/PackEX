"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, TableScroll } from "@/components/ui";
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
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)] sm:max-w-md"
        />
        {isPending && (
          <p className="mt-1 text-xs text-[var(--muted)]">กำลังค้นหา…</p>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((rec) => (
          <button
            key={rec.id}
            type="button"
            onClick={() => openVideo(rec.id)}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[var(--accent)]">{rec.orderNo}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {rec.stationCode} · {format(new Date(rec.startedAt), "d MMM HH:mm", { locale: th })}
                </p>
                <p className="mt-1 text-sm text-[var(--ink)]">{rec.employeeName}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={rec.status === "ready" ? "success" : "neutral"}>
                  {statusLabel(rec.status)}
                </Badge>
                {rec.videoCount > 1 && <Badge tone="neutral">{rec.videoCount} วิดีโอ</Badge>}
              </div>
            </div>
            <p
              className={`mt-3 text-sm font-medium ${rec.completenessScore >= 80 ? "text-emerald-600" : "text-amber-600"}`}
            >
              ครบถ้วน {rec.completenessScore}%
            </p>
          </button>
        ))}
        {items.length === 0 && (
          <p className="py-8 text-center text-[var(--muted)]">ไม่พบวิดีโอ</p>
        )}
      </div>

      <div className="hidden md:block">
        <TableScroll>
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
        </TableScroll>
      </div>
    </div>
  );
}

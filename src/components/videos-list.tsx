"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Film, Layers } from "lucide-react";
import {
  Badge,
  EmptyState,
  Progress,
  Table,
  TableCard,
  TBody,
  Td,
  Th,
  THead,
  Toolbar,
  Tr,
} from "@/components/ui";
import { SearchInput } from "@/components/ui-client";
import { statusLabel, statusTone } from "@/lib/utils";
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

function scoreTone(score: number) {
  if (score >= 80) return "text-success-ink";
  if (score >= 50) return "text-warning-ink";
  return "text-danger-ink";
}

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

  const empty = (
    <EmptyState
      icon={Film}
      title={q ? "ไม่พบวิดีโอที่ตรงกับการค้นหา" : "ยังไม่มีวิดีโอ"}
      description={
        q
          ? `ไม่พบผลลัพธ์สำหรับ “${q}” — ลองค้นด้วยเลขออเดอร์อื่น`
          : "เมื่อสถานีเริ่มบันทึกการแพ็ค วิดีโอจะปรากฏที่นี่โดยอัตโนมัติ"
      }
    />
  );

  return (
    <div>
      {/* Mobile: cards */}
      <div className="md:hidden">
        <SearchInput value={q} onChange={setQ} placeholder="ค้นหาเลขออเดอร์…" className="mb-4" />
        {items.length === 0 ? (
          empty
        ) : (
          <div className="space-y-3">
            {items.map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => openVideo(rec.id)}
                className="card-interactive w-full rounded-xl border border-line bg-surface p-4 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{rec.orderNo}</p>
                    <p className="mt-1 text-[13px] text-muted">
                      {rec.stationCode} ·{" "}
                      {format(new Date(rec.startedAt), "d MMM HH:mm", { locale: th })}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-2">{rec.employeeName}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge tone={statusTone(rec.status)} dot>
                      {statusLabel(rec.status)}
                    </Badge>
                    {rec.videoCount > 1 ? (
                      <Badge icon={Layers}>{rec.videoCount} คลิป</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3.5 flex items-center gap-3">
                  <Progress
                    value={rec.completenessScore}
                    tone={rec.completenessScore >= 80 ? "brand" : "warning"}
                    className="flex-1"
                  />
                  <span
                    className={`tabular text-xs font-medium ${scoreTone(rec.completenessScore)}`}
                  >
                    {rec.completenessScore}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <TableCard
          header={
            <Toolbar
              actions={
                isPending ? (
                  <span className="text-xs text-muted">กำลังค้นหา…</span>
                ) : (
                  <span className="text-xs text-muted">{items.length} รายการ</span>
                )
              }
            >
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="ค้นหาเลขออเดอร์…"
                className="w-full sm:w-72"
              />
            </Toolbar>
          }
        >
          {items.length === 0 ? (
            <div className="p-6">{empty}</div>
          ) : (
            <Table>
              <THead>
                <Th>ออเดอร์</Th>
                <Th>สถานี</Th>
                <Th>สถานะ</Th>
                <Th>ความครบถ้วน</Th>
                <Th>เวลา</Th>
                <Th>พนักงาน</Th>
                <Th className="w-10" />
              </THead>
              <TBody>
                {items.map((rec) => (
                  <Tr
                    key={rec.id}
                    className="group"
                    onClick={() => openVideo(rec.id)}
                    ariaLabel={`เปิดวิดีโอออเดอร์ ${rec.orderNo}`}
                  >
                    <Td className="font-medium text-ink">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{rec.orderNo}</span>
                        {rec.videoCount > 1 ? (
                          <Badge icon={Layers}>{rec.videoCount}</Badge>
                        ) : null}
                      </div>
                    </Td>
                    <Td>{rec.stationCode}</Td>
                    <Td>
                      <Badge tone={statusTone(rec.status)} dot>
                        {statusLabel(rec.status)}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Progress
                          value={rec.completenessScore}
                          tone={rec.completenessScore >= 80 ? "brand" : "warning"}
                          className="w-16"
                        />
                        <span
                          className={`tabular text-xs font-medium ${scoreTone(rec.completenessScore)}`}
                        >
                          {rec.completenessScore}%
                        </span>
                      </div>
                    </Td>
                    <Td className="text-muted">
                      {format(new Date(rec.startedAt), "d MMM HH:mm", { locale: th })}
                    </Td>
                    <Td>{rec.employeeName}</Td>
                    <Td align="right">
                      <ChevronRight
                        size={16}
                        className="text-faint transition group-hover:translate-x-0.5 group-hover:text-ink-2"
                      />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </TableCard>
      </div>
    </div>
  );
}

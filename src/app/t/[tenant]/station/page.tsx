"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type HealthStrip = {
  camera: "ok" | "warn" | "error";
  disk: "ok" | "warn" | "error";
  sync: "ok" | "warn" | "error";
};

export default function StationConsolePage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const inputRef = useRef<HTMLInputElement>(null);

  const [barcode, setBarcode] = useState("");
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<HealthStrip>({
    camera: "ok",
    disk: "ok",
    sync: "ok",
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setOrderNo(trimmed);
      setBarcode("");
      setError("");
      setCompleteness(null);
    },
    [],
  );

  async function startRecording() {
    if (!orderNo) {
      setError("สแกนหรือพิมพ์เลขออเดอร์ก่อน");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/t/${tenant}/station/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", orderNo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เริ่มอัดไม่สำเร็จ");
        return;
      }
      setRecording(true);
      setRecordingId(data.recordingId);
      setHealth({ camera: "ok", disk: "ok", sync: "ok" });
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function stopRecording() {
    if (!recordingId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/t/${tenant}/station/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", recordingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "หยุดอัดไม่สำเร็จ");
        return;
      }
      setRecording(false);
      setCompleteness(data.completenessScore);
      setRecordingId(null);
      setHealth((h) => ({ ...h, sync: data.completenessScore >= 80 ? "ok" : "warn" }));
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  function resetStation() {
    setOrderNo(null);
    setBarcode("");
    setRecording(false);
    setRecordingId(null);
    setCompleteness(null);
    setError("");
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
            Station Console
          </h1>
          <p className="mt-1 text-[var(--muted)]">สแกนออเดอร์ → ยืนยัน → อัดวิดีโอ</p>
        </div>
        {recording && (
          <Badge tone="rec" className="px-4 py-2 text-base font-bold uppercase">
            <span className="rec-pulse mr-2 inline-block h-2.5 w-2.5 rounded-full bg-white" />
            REC
          </Badge>
        )}
      </div>

      <div className="mb-6 flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
        <HealthItem label="กล้อง" status={health.camera} />
        <HealthItem label="ดิสก์" status={health.disk} />
        <HealthItem label="ซิงก์" status={health.sync} />
      </div>

      <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <label className="mb-2 block text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          สแกนบาร์โค้ด / เลขออเดอร์
        </label>
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleScan(barcode);
            }
          }}
          disabled={recording}
          placeholder="ORD-XXXXX หรือสแกนบาร์โค้ด"
          className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface-2)] px-4 py-5 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)] outline-none focus:border-[var(--accent)] disabled:opacity-50 md:text-3xl"
          autoComplete="off"
        />

        {orderNo && (
          <div className="mt-6 rounded-xl bg-[var(--surface-2)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">ออเดอร์ที่ยืนยัน</div>
            <div className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--ink)] md:text-5xl">
              {orderNo}
            </div>
          </div>
        )}

        {completeness !== null && (
          <div
            className={cn(
              "mt-6 rounded-xl p-4 text-center",
              completeness >= 80 ? "bg-emerald-500/15" : "bg-amber-500/15",
            )}
          >
            <div className="text-sm text-[var(--muted)]">คะแนนความครบถ้วน</div>
            <div className="font-[family-name:var(--font-display)] text-5xl font-bold text-[var(--ink)]">
              {completeness}%
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-rose-500/10 px-4 py-3 text-base text-rose-600">{error}</p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {!recording ? (
            <>
              <Button
                variant="primary"
                className="min-h-14 flex-1 px-6 text-lg font-semibold"
                onClick={startRecording}
                disabled={loading || !orderNo}
              >
                เริ่มอัดวิดีโอ
              </Button>
              <Button
                variant="secondary"
                className="min-h-14 px-6 text-lg"
                onClick={resetStation}
                disabled={loading}
              >
                ล้าง
              </Button>
            </>
          ) : (
            <Button
              variant="danger"
              className="min-h-16 w-full px-6 text-xl font-bold uppercase"
              onClick={stopRecording}
              disabled={loading}
            >
              หยุดอัด
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthItem({ label, status }: { label: string; status: "ok" | "warn" | "error" }) {
  const colors = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    error: "bg-rose-500",
  };
  return (
    <div className="flex flex-1 items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", colors[status])} />
      <span className="font-medium text-[var(--ink)]">{label}</span>
      <span className="ml-auto text-[var(--muted)]">
        {status === "ok" ? "ปกติ" : status === "warn" ? "ตรวจสอบ" : "ผิดปกติ"}
      </span>
    </div>
  );
}

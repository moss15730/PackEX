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

type CameraDevice = {
  deviceId: string;
  label: string;
};

function pickRecorderMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

export default function StationConsolePage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [barcode, setBarcode] = useState("");
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [health, setHealth] = useState<HealthStrip>({
    camera: "warn",
    disk: "ok",
    sync: "ok",
  });

  const stopStream = useCallback(() => {
    recorderRef.current = null;
    chunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setPreviewReady(false);
  }, []);

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError("เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง");
      setHealth((h) => ({ ...h, camera: "error" }));
      return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices
      .filter((d) => d.kind === "videoinput")
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `กล้อง ${i + 1}`,
      }));

    setCameras(videoInputs);
    setSelectedCameraId((prev) => {
      if (prev && videoInputs.some((c) => c.deviceId === prev)) return prev;
      return videoInputs[0]?.deviceId || "";
    });
    return videoInputs;
  }, []);

  const startPreview = useCallback(
    async (deviceId?: string) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("เบราว์เซอร์นี้ไม่รองรับกล้อง");
        setHealth((h) => ({ ...h, camera: "error" }));
        return;
      }

      setError("");
      try {
        // Stop previous tracks before opening a new device
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 960, max: 1280 },
                height: { ideal: 540, max: 720 },
                frameRate: { ideal: 20, max: 24 },
              }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 960, max: 1280 },
                height: { ideal: 540, max: 720 },
                frameRate: { ideal: 20, max: 24 },
              },
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        // Labels often appear only after permission is granted
        const list = await refreshCameras();
        const track = stream.getVideoTracks()[0];
        const settingsId = track?.getSettings().deviceId;
        if (settingsId) {
          setSelectedCameraId(settingsId);
        } else if (list[0]) {
          setSelectedCameraId(list[0].deviceId);
        }

        setPreviewReady(true);
        setHealth((h) => ({ ...h, camera: "ok" }));
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("กรุณาอนุญาตให้ใช้กล้องและไมโครโฟนในเบราว์เซอร์");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("ไม่พบกล้องบนอุปกรณ์นี้");
        } else {
          setError("เปิดกล้องไม่สำเร็จ");
        }
        setPreviewReady(false);
        setHealth((h) => ({ ...h, camera: "error" }));
      }
    },
    [refreshCameras],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onDeviceChange = () => {
      void refreshCameras();
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      stopStream();
    };
  }, [refreshCameras, stopStream]);

  // Open camera once an order is confirmed
  useEffect(() => {
    if (!orderNo || recording) return;
    void startPreview(selectedCameraId || undefined);
    // Only when order is newly set — camera switches handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  const handleScan = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setOrderNo(trimmed);
    setBarcode("");
    setError("");
    setCompleteness(null);
  }, []);

  async function onCameraChange(deviceId: string) {
    setSelectedCameraId(deviceId);
    if (recording) return;
    await startPreview(deviceId);
  }

  async function startRecording() {
    if (!orderNo) {
      setError("สแกนหรือพิมพ์เลขออเดอร์ก่อน");
      return;
    }
    if (!streamRef.current || !previewReady) {
      setError("กรุณาเลือกและเปิดกล้องก่อนเริ่มอัด");
      await startPreview(selectedCameraId || undefined);
      return;
    }

    const mimeType = pickRecorderMimeType();
    if (!mimeType && typeof MediaRecorder === "undefined") {
      setError("เบราว์เซอร์นี้ไม่รองรับการอัดวิดีโอ");
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

      chunksRef.current = [];
      // ~1.5 Mbps keeps a few minutes under Supabase Free 50MB/file limit
      const recorderOptions: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 1_200_000,
        audioBitsPerSecond: 64_000,
      };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(streamRef.current, recorderOptions);
      } catch {
        recorder = new MediaRecorder(
          streamRef.current,
          mimeType ? { mimeType } : undefined,
        );
      }
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;

      setRecording(true);
      setRecordingId(data.recordingId);
      setHealth({ camera: "ok", disk: "ok", sync: "ok" });
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function stopRecorder(): Promise<Blob | null> {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return null;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        recorderRef.current = null;
        resolve(blob.size > 0 ? blob : null);
      };
      try {
        if (recorder.state === "recording") recorder.requestData();
      } catch {
        // ignore
      }
      recorder.stop();
    });
  }

  async function uploadRecording(recId: string, blob: Blob) {
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const contentType = blob.type || "video/webm";
    const camLabel =
      cameras.find((c) => c.deviceId === selectedCameraId)?.label || "device-camera";

    // 1) Ask server for a signed upload URL (tiny JSON — works on Vercel)
    const signRes = await fetch(`/api/t/${tenant}/upload/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordingId: recId,
        cameraLabel: camLabel,
        contentType,
        filename: `${camLabel.replace(/[^\w.\-ก-๙]+/gi, "_")}.${ext}`,
      }),
    });
    const signData = await signRes.json().catch(() => ({}));
    if (!signRes.ok) {
      throw new Error(signData.error || `ขอ upload URL ไม่สำเร็จ (${signRes.status})`);
    }

    // 2) Upload the video bytes straight to Supabase (bypasses Vercel 4.5MB body limit)
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", blob, `${camLabel}.${ext}`);
    const putRes = await fetch(signData.signedUrl as string, {
      method: "PUT",
      headers: {
        "x-upsert": "true",
      },
      body: form,
    });
    if (!putRes.ok) {
      const text = await putRes.text().catch(() => "");
      throw new Error(
        text ||
          `อัปโหลดไป Supabase ไม่สำเร็จ (${putRes.status}) — ตรวจขนาดไฟล์ (Free ≤50MB) และ Storage settings`,
      );
    }

    // 3) Register the file in PackEX DB
    const completeRes = await fetch(`/api/t/${tenant}/upload/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordingId: recId,
        cameraLabel: camLabel,
        storagePath: signData.storagePath,
        sizeBytes: blob.size,
        kind: "video",
        contentType,
      }),
    });
    const completeData = await completeRes.json().catch(() => ({}));
    if (!completeRes.ok) {
      throw new Error(completeData.error || `บันทึกไฟล์ไม่สำเร็จ (${completeRes.status})`);
    }
    return completeData;
  }

  async function stopRecording() {
    if (!recordingId) return;
    setLoading(true);
    setError("");
    try {
      const blob = await stopRecorder();
      if (!blob) {
        throw new Error("ไม่พบข้อมูลวิดีโอที่อัด — ลองอัดใหม่อีกครั้ง");
      }

      const uploaded = await uploadRecording(recordingId, blob);

      const res = await fetch(`/api/t/${tenant}/station/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop",
          recordingId,
          clientUploaded: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "หยุดอัดไม่สำเร็จ");
        return;
      }
      setRecording(false);
      setCompleteness(data.completenessScore);
      setRecordingId(null);
      setHealth((h) => ({
        ...h,
        sync: data.completenessScore >= 80 ? "ok" : "warn",
      }));
      if (uploaded?.storageError) {
        setError(
          `บันทึกวิดีโอแล้ว และดูได้ในหน้า Videos — แต่ยังขึ้น Supabase ไม่ได้: ${uploaded.storageError}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  function resetStation() {
    if (recording) return;
    stopStream();
    setOrderNo(null);
    setBarcode("");
    setRecording(false);
    setRecordingId(null);
    setCompleteness(null);
    setError("");
    setHealth((h) => ({ ...h, camera: "warn" }));
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
            Station Console
          </h1>
          <p className="mt-1 text-[var(--muted)]">สแกนออเดอร์ → เลือกกล้อง → อัดวิดีโอ</p>
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

        {orderNo && (
          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-2 block text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
                  เลือกกล้อง
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => void onCameraChange(e.target.value)}
                  disabled={recording || cameras.length === 0}
                  className="w-full rounded-xl border-2 border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-base text-[var(--ink)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                >
                  {cameras.length === 0 && <option value="">กำลังค้นหากล้อง...</option>}
                  {cameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="secondary"
                className="min-h-12 px-4"
                onClick={() => void startPreview(selectedCameraId || undefined)}
                disabled={recording || loading}
              >
                เปิดกล้องใหม่
              </Button>
            </div>

            <div className="relative overflow-hidden rounded-xl border-2 border-[var(--border)] bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="aspect-video w-full object-cover"
              />
              {!previewReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm text-white/80">
                  รออนุญาตกล้อง / เปิดกล้อง...
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--muted)]">
              ใช้กล้องของคอมหรือมือถือเครื่องนี้ — อนุญาตเมื่อเบราว์เซอร์ถามสิทธิ์
            </p>
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
                disabled={loading || !orderNo || !previewReady}
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
              {loading ? "กำลังบันทึก..." : "หยุดอัด"}
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

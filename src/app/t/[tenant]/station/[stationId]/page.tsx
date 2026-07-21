"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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

type StationInfo = {
  id: string;
  code: string;
  name: string;
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
  const stationId = params.stationId as string;
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [station, setStation] = useState<StationInfo | null>(null);
  const [stationError, setStationError] = useState("");
  const [barcode, setBarcode] = useState("");
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState<number | null>(null);
  const [orderVideoCount, setOrderVideoCount] = useState(0);
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

  useEffect(() => {
    let cancelled = false;
    async function loadStation() {
      try {
        const res = await fetch(
          `/api/t/${tenant}/station/record?stationId=${encodeURIComponent(stationId)}`,
        );
        const data = await res.json().catch(() => ({} as { error?: string }));
        if (cancelled) return;
        if (!res.ok) {
          setStationError(
            typeof data.error === "string" && data.error
              ? data.error
              : res.status === 404
                ? "ไม่พบสถานีหรือสถานีไม่พร้อมใช้งาน"
                : "โหลดสถานีไม่สำเร็จ",
          );
          return;
        }
        if (!data.station) {
          setStationError("ไม่พบสถานี");
          return;
        }
        setStation(data.station);
      } catch {
        if (!cancelled) setStationError("โหลดสถานีไม่สำเร็จ");
      }
    }
    void loadStation();
    return () => {
      cancelled = true;
    };
  }, [tenant, stationId]);

  const stopStream = useCallback(() => {
    recorderRef.current = null;
    chunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
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
        void fetch(`/api/t/${tenant}/onboarding`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "camera-tested" }),
        });
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
  }, [station]);

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

  useEffect(() => {
    if (!orderNo || recording) return;
    void startPreview(selectedCameraId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  const handleScan = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setOrderNo(trimmed);
    setBarcode("");
    setError("");
    setCompleteness(null);
    setOrderVideoCount(0);
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
        body: JSON.stringify({ action: "start", orderNo, stationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เริ่มอัดไม่สำเร็จ");
        return;
      }

      chunksRef.current = [];
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

  async function uploadBlob(
    recId: string,
    blob: Blob,
    opts: { kind: "video" | "snapshot"; cameraLabel?: string; contentType?: string },
  ) {
    const contentType = opts.contentType || blob.type || "video/webm";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : contentType.includes("webm") ? "webm" : "mp4";
    const camLabel = opts.cameraLabel || cameras.find((c) => c.deviceId === selectedCameraId)?.label || "device-camera";
    const defaultFilename = opts.kind === "snapshot" ? `snapshot.${ext}` : `camera.${ext}`;

    const signRes = await fetch(`/api/t/${tenant}/upload/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordingId: recId,
        cameraLabel: camLabel,
        contentType,
        filename: defaultFilename,
      }),
    });
    const signData = await signRes.json().catch(() => ({}));
    if (!signRes.ok) {
      throw new Error(signData.error || `ขอ upload URL ไม่สำเร็จ (${signRes.status})`);
    }

    const form = new FormData();
    form.append("cacheControl", "3600");
    const uploadName = String(signData.filename || defaultFilename);
    form.append("", blob, uploadName);
    const putRes = await fetch(signData.signedUrl as string, {
      method: "PUT",
      headers: { "x-upsert": "true" },
      body: form,
    });
    if (!putRes.ok) {
      const text = await putRes.text().catch(() => "");
      throw new Error(
        text ||
          `อัปโหลดไป Supabase ไม่สำเร็จ (${putRes.status}) — ตรวจขนาดไฟล์ (Free ≤50MB) และ Storage settings`,
      );
    }

    const completeRes = await fetch(`/api/t/${tenant}/upload/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordingId: recId,
        cameraLabel: camLabel,
        storagePath: signData.storagePath,
        sizeBytes: blob.size,
        kind: opts.kind,
        contentType,
      }),
    });
    const completeData = await completeRes.json().catch(() => ({}));
    if (!completeRes.ok) {
      throw new Error(completeData.error || `บันทึกไฟล์ไม่สำเร็จ (${completeRes.status})`);
    }
    return completeData;
  }

  async function captureSnapshot(recId: string) {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return;
    await uploadBlob(recId, blob, { kind: "snapshot", contentType: "image/jpeg" });
  }

  async function uploadRecording(recId: string, blob: Blob) {
    return uploadBlob(recId, blob, { kind: "video" });
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

      try {
        await captureSnapshot(recordingId);
      } catch {
        // snapshot is optional for scoring but improves completeness
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
      setOrderVideoCount((count) => count + 1);
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

  function recordAnotherVideo() {
    if (recording) return;
    setCompleteness(null);
    setError("");
    setRecordingId(null);
    void startPreview(selectedCameraId || undefined);
  }

  function resetStation() {
    if (recording) return;
    stopStream();
    setOrderNo(null);
    setBarcode("");
    setRecording(false);
    setRecordingId(null);
    setCompleteness(null);
    setOrderVideoCount(0);
    setError("");
    setHealth((h) => ({ ...h, camera: "warn" }));
    inputRef.current?.focus();
  }

  if (stationError) {
    return (
      <div className="mx-auto max-w-lg rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow)]">
        <p className="text-rose-600">{stationError}</p>
        <Link
          href={`/t/${tenant}/station`}
          className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
        >
          กลับไปเลือกสถานี
        </Link>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center text-sm text-[var(--muted)]">
        กำลังโหลดสถานี…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href={`/t/${tenant}/station`}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            ← เปลี่ยนสถานี
          </Link>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
              Station Console
            </h1>
            <span className="text-sm text-[var(--muted)]">
              {station.code} · {station.name}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1.5 sm:flex">
            <HealthPill label="กล้อง" status={health.camera} />
            <HealthPill label="ดิสก์" status={health.disk} />
            <HealthPill label="ซิงก์" status={health.sync} />
          </div>
          {recording && (
            <Badge tone="rec" className="px-3 py-1 text-sm font-bold uppercase">
              <span className="rec-pulse mr-1.5 inline-block h-2 w-2 rounded-full bg-white" />
              REC
            </Badge>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden max-lg:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow)] sm:p-4">
          <label className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
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
            disabled={recording || completeness !== null}
            placeholder="สแกนบาร์โค้ด / เลขออเดอร์"
            className="w-full rounded-[var(--radius-sm)] border-2 border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_25%,transparent)] disabled:opacity-50 sm:text-2xl"
            autoComplete="off"
          />

          {orderNo && (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="rounded-[var(--radius-sm)] bg-[var(--surface-2)] px-3 py-2.5 ring-1 ring-inset ring-[var(--border)]">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  ออเดอร์
                </div>
                <div className="font-[family-name:var(--font-display)] text-2xl font-bold leading-none text-[var(--ink)] sm:text-3xl">
                  {orderNo}
                </div>
              </div>
              {completeness !== null && (
                <div
                  className={cn(
                    "rounded-[var(--radius-sm)] px-3 py-2.5 text-center ring-1 ring-inset",
                    completeness >= 80
                      ? "bg-emerald-500/15 ring-emerald-500/25"
                      : "bg-amber-500/15 ring-amber-500/25",
                  )}
                >
                  <div className="text-[10px] font-semibold uppercase text-[var(--muted)]">
                    ครบถ้วน
                  </div>
                  <div className="font-[family-name:var(--font-display)] text-2xl font-bold">
                    {completeness}%
                  </div>
                </div>
              )}
            </div>
          )}

          {orderNo && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                เลือกกล้อง
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedCameraId}
                  onChange={(e) => void onCameraChange(e.target.value)}
                  disabled={recording || cameras.length === 0}
                  className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
                >
                  {cameras.length === 0 && <option value="">กำลังค้นหากล้อง...</option>}
                  {cameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  className="shrink-0 px-3 py-2 text-sm"
                  onClick={() => void startPreview(selectedCameraId || undefined)}
                  disabled={recording || loading}
                >
                  รีเฟรช
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-[var(--radius-sm)] bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-1">
            {recording ? (
              <Button
                variant="danger"
                className="min-h-11 w-full text-base font-bold uppercase"
                onClick={stopRecording}
                disabled={loading}
              >
                {loading ? "กำลังบันทึก..." : "หยุดอัด"}
              </Button>
            ) : completeness !== null ? (
              <>
                <p className="text-center text-xs text-[var(--muted)]">
                  บันทึกแล้ว {orderVideoCount} วิดีโอ
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-11 flex-1"
                    onClick={recordAnotherVideo}
                    disabled={loading}
                  >
                    อัดเพิ่ม
                  </Button>
                  <Button
                    variant="primary"
                    className="min-h-11 flex-1 font-semibold"
                    onClick={resetStation}
                    disabled={loading}
                  >
                    เสร็จสิ้น
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="min-h-11 flex-1 font-semibold"
                  onClick={startRecording}
                  disabled={loading || !orderNo || !previewReady}
                >
                  เริ่มอัดวิดีโอ
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-11 px-4"
                  onClick={resetStation}
                  disabled={loading || !orderNo}
                >
                  ล้าง
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow)] sm:p-3">
          {orderNo ? (
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius-sm)] bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-contain"
              />
              {!previewReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm text-white/80">
                  รออนุญาตกล้อง / เปิดกล้อง...
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[120px] flex-1 items-center justify-center rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 text-center text-sm text-[var(--muted)]">
              สแกนออเดอร์เพื่อเปิดกล้องและอัดวิดีโอ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthPill({ label, status }: { label: string; status: "ok" | "warn" | "error" }) {
  const colors = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    error: "bg-rose-500",
  };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium">
      <span className={cn("h-1.5 w-1.5 rounded-full", colors[status])} />
      {label}
    </span>
  );
}

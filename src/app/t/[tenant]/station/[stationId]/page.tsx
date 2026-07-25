"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  Circle,
  HardDrive,
  MonitorX,
  Plus,
  RefreshCw,
  ScanLine,
  Square,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Button, ButtonLink, Callout, Select, Spinner } from "@/components/ui";
import { PageLoading } from "@/components/page-loading";
import { paintBurnIn } from "@/lib/recording-overlay";
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

type OverlayInfo = {
  enabled: boolean;
  tenantSlug: string;
  timezone: string;
  employeeName: string;
  employeeCode: string;
};

type StationPolicy = {
  idleAutoStopMinutes: number;
  videoPreset: "economy" | "standard" | "high" | string;
};

function bitrateForPreset(preset: string) {
  if (preset === "economy") return { video: 700_000, audio: 48_000 };
  if (preset === "high") return { video: 2_000_000, audio: 96_000 };
  return { video: 1_200_000, audio: 64_000 };
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const composeRafRef = useRef(0);
  const overlayRef = useRef<OverlayInfo | null>(null);

  const [station, setStation] = useState<StationInfo | null>(null);
  const [overlay, setOverlay] = useState<OverlayInfo | null>(null);
  const [policy, setPolicy] = useState<StationPolicy>({
    idleAutoStopMinutes: 10,
    videoPreset: "standard",
  });
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
  const [clock, setClock] = useState("");
  const [health, setHealth] = useState<HealthStrip>({
    camera: "warn",
    disk: "ok",
    sync: "ok",
  });

  useEffect(() => {
    overlayRef.current = overlay;
  }, [overlay]);

  useEffect(() => {
    if (!overlay?.enabled || !orderNo) return;
    const tick = () => {
      try {
        setClock(
          new Date().toLocaleString("th-TH", {
            timeZone: overlay.timezone || "Asia/Bangkok",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
        );
      } catch {
        setClock("");
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [overlay, orderNo]);

  useEffect(() => {
    let cancelled = false;
    async function loadStation() {
      try {
        const res = await fetch(
          `/api/t/${tenant}/station/record?stationId=${encodeURIComponent(stationId)}`,
        );
        const data = await res.json().catch(
          () =>
            ({} as {
              error?: string;
              station?: StationInfo;
              overlay?: OverlayInfo;
              policy?: StationPolicy;
            }),
        );
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
        if (data.overlay) setOverlay(data.overlay);
        if (data.policy) setPolicy(data.policy);
      } catch {
        if (!cancelled) setStationError("โหลดสถานีไม่สำเร็จ");
      }
    }
    void loadStation();
    return () => {
      cancelled = true;
    };
  }, [tenant, stationId]);

  const stopComposeLoop = useCallback(() => {
    if (composeRafRef.current) {
      cancelAnimationFrame(composeRafRef.current);
      composeRafRef.current = 0;
    }
  }, []);

  const stopStream = useCallback(() => {
    stopComposeLoop();
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
  }, [stopComposeLoop]);

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
    [refreshCameras, tenant],
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

  const stopRecordingRef = useRef<() => Promise<void>>(async () => {});

  const handleScan = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      if (recording) {
        if (orderNo && trimmed === orderNo) {
          void stopRecordingRef.current();
        } else {
          setError(
            "กำลังอัดออเดอร์นี้อยู่ — สแกนเลขเดิมเพื่อปิดงาน หรือกดหยุดอัด (ห้ามสแกนออเดอร์อื่น)",
          );
        }
        setBarcode("");
        return;
      }

      setOrderNo(trimmed);
      setBarcode("");
      setError("");
      setCompleteness(null);
      setOrderVideoCount(0);
      void startPreview(selectedCameraId || undefined);
    },
    [recording, orderNo, selectedCameraId, startPreview],
  );

  async function onCameraChange(deviceId: string) {
    setSelectedCameraId(deviceId);
    if (recording) return;
    await startPreview(deviceId);
  }

  async function startRecording(reopenReason?: string) {
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
        body: JSON.stringify({
          action: "start",
          orderNo,
          stationId,
          ...(reopenReason ? { reopenReason } : {}),
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === "REOPEN_REQUIRED") {
        const reason = window.prompt(
          data.error ||
            "ออเดอร์นี้มีคลิปพร้อมแล้ว — ระบุเหตุผลที่ต้องการอัดใหม่",
        );
        if (!reason?.trim()) {
          setError("ต้องระบุเหตุผลจึงจะอัดออเดอร์เดิมได้อีกครั้ง");
          return;
        }
        await startRecording(reason.trim());
        return;
      }
      if (!res.ok) {
        setError(data.error || "เริ่มอัดไม่สำเร็จ");
        return;
      }

      chunksRef.current = [];

      let recordStream: MediaStream = streamRef.current;
      stopComposeLoop();

      const ov = overlayRef.current;
      if (ov?.enabled && videoRef.current && canvasRef.current && station) {
        const videoEl = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const draw = () => {
            const w = videoEl.videoWidth || 960;
            const h = videoEl.videoHeight || 540;
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;
            ctx.drawImage(videoEl, 0, 0, w, h);
            paintBurnIn(ctx, w, h, {
              orderNo: orderNo!,
              stationCode: station.code,
              employeeName: ov.employeeName,
              tenantSlug: ov.tenantSlug,
              timezone: ov.timezone,
              recording: true,
            });
            composeRafRef.current = requestAnimationFrame(draw);
          };
          draw();

          const composed = canvas.captureStream(20);
          for (const track of streamRef.current.getAudioTracks()) {
            composed.addTrack(track);
          }
          recordStream = composed;
        }
      }

      const rates = bitrateForPreset(policy.videoPreset);
      const recorderOptions: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: rates.video,
        audioBitsPerSecond: rates.audio,
      };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(recordStream, recorderOptions);
      } catch {
        recorder = new MediaRecorder(
          recordStream,
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
      stopComposeLoop();
      return null;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        stopComposeLoop();
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
    const maxBytes = 45 * 1024 * 1024;
    if (blob.size > maxBytes) {
      throw new Error(
        `ไฟล์ใหญ่เกิน ${(maxBytes / (1024 * 1024)).toFixed(0)} MB (ขนาด ${(blob.size / (1024 * 1024)).toFixed(1)} MB) — อัดสั้นลงหรือลดคุณภาพในตั้งค่าองค์กร`,
      );
    }

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
    const ov = overlayRef.current;
    if (ov?.enabled && station && orderNo) {
      paintBurnIn(ctx, canvas.width, canvas.height, {
        orderNo,
        stationCode: station.code,
        employeeName: ov.employeeName,
        tenantSlug: ov.tenantSlug,
        timezone: ov.timezone,
        recording: true,
      });
    }
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

  stopRecordingRef.current = stopRecording;

  useEffect(() => {
    if (!recording) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "กำลังอัดวิดีโออยู่ — ออกจากหน้านี้จะทำให้การอัดเสียหาย";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [recording]);

  useEffect(() => {
    if (!recording) return;
    const idleMs = Math.max(1, policy.idleAutoStopMinutes) * 60 * 1000;
    let timer = window.setTimeout(() => {
      setError(
        `หยุดอัดอัตโนมัติเพราะไม่มีการใช้งาน ${policy.idleAutoStopMinutes} นาที`,
      );
      void stopRecordingRef.current();
    }, idleMs);

    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setError(
          `หยุดอัดอัตโนมัติเพราะไม่มีการใช้งาน ${policy.idleAutoStopMinutes} นาที`,
        );
        void stopRecordingRef.current();
      }, idleMs);
    };

    const events = ["pointerdown", "keydown"] as const;
    for (const event of events) window.addEventListener(event, bump);
    return () => {
      window.clearTimeout(timer);
      for (const event of events) window.removeEventListener(event, bump);
    };
  }, [recording, policy.idleAutoStopMinutes]);

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
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-ink">
            <MonitorX size={24} strokeWidth={1.9} />
          </span>
          <h1 className="mt-5 text-lg font-semibold tracking-tight text-ink">
            เปิดสถานีไม่ได้
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{stationError}</p>
          <ButtonLink
            href={`/t/${tenant}/station`}
            variant="secondary"
            icon={ArrowLeft}
            className="mt-6"
          >
            กลับไปเลือกสถานี
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (!station) {
    return <PageLoading label="กำลังเปิดสถานี…" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {/* Console header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/t/${tenant}/station`}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted transition hover:text-ink"
          >
            <ArrowLeft size={13} />
            เปลี่ยนสถานี
          </Link>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h1 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
              Station Console
            </h1>
            <span className="text-sm text-muted">
              {station.code} · {station.name}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1.5 sm:flex">
            <HealthPill label="กล้อง" status={health.camera} icon={Video} />
            <HealthPill label="ดิสก์" status={health.disk} icon={HardDrive} />
            <HealthPill label="ซิงก์" status={health.sync} icon={RefreshCw} />
          </div>
          {recording && (
            <span className="rec-halo inline-flex items-center gap-2 rounded-full bg-rec px-3.5 py-1.5 text-[13px] font-semibold tracking-wide text-white uppercase">
              <span className="rec-pulse inline-block h-2 w-2 rounded-full bg-white" />
              REC
            </span>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden max-lg:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,23rem)_1fr]">
        {/* Control panel */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-sm">
          <div>
            <label
              htmlFor="barcode"
              className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase"
            >
              <ScanLine size={13} />
              สแกนบาร์โค้ด / เลขออเดอร์
            </label>
            <input
              id="barcode"
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
              placeholder="สแกนหรือพิมพ์เลขออเดอร์"
              className="w-full rounded-lg border-2 border-line bg-subtle px-3.5 py-3 text-xl font-semibold tracking-tight text-ink outline-none transition placeholder:text-[15px] placeholder:font-normal placeholder:text-faint focus:border-brand focus:bg-surface focus:ring-3 focus:ring-brand/16 disabled:opacity-50 sm:text-2xl"
              autoComplete="off"
            />
          </div>

          {orderNo && (
            <div className="grid grid-cols-[1fr_auto] gap-2.5">
              <div className="rounded-xl border border-line bg-subtle px-3.5 py-3">
                <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
                  ออเดอร์
                </div>
                <div className="mt-1 text-2xl leading-none font-semibold tracking-tight text-ink sm:text-3xl">
                  {orderNo}
                </div>
              </div>
              {completeness !== null && (
                <div
                  className={cn(
                    "rounded-xl px-4 py-3 text-center ring-1 ring-inset",
                    completeness >= 80
                      ? "bg-success-soft ring-success/25"
                      : "bg-warning-soft ring-warning/30",
                  )}
                >
                  <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
                    ครบถ้วน
                  </div>
                  <div
                    className={cn(
                      "tabular mt-1 text-2xl leading-none font-semibold",
                      completeness >= 80 ? "text-success-ink" : "text-warning-ink",
                    )}
                  >
                    {completeness}%
                  </div>
                </div>
              )}
            </div>
          )}

          {orderNo && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                <Camera size={13} />
                เลือกกล้อง
              </label>
              <div className="flex gap-2">
                <Select
                  value={selectedCameraId}
                  onChange={(e) => void onCameraChange(e.target.value)}
                  disabled={recording || cameras.length === 0}
                  className="flex-1"
                >
                  {cameras.length === 0 && <option value="">กำลังค้นหากล้อง…</option>}
                  {cameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="รีเฟรชกล้อง"
                  onClick={() => void startPreview(selectedCameraId || undefined)}
                  disabled={recording || loading}
                >
                  <RefreshCw size={16} />
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Callout tone="danger" icon={AlertTriangle}>
              {error}
            </Callout>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-2">
            {recording ? (
              <Button
                variant="danger"
                size="lg"
                className="w-full text-base font-semibold"
                onClick={stopRecording}
                loading={loading}
                icon={Square}
              >
                {loading ? "กำลังบันทึก…" : "หยุดอัด"}
              </Button>
            ) : completeness !== null ? (
              <>
                <p className="text-center text-xs text-muted">
                  บันทึกแล้ว {orderVideoCount} วิดีโอในออเดอร์นี้
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                    onClick={recordAnotherVideo}
                    disabled={loading}
                    icon={Plus}
                  >
                    อัดเพิ่ม
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={resetStation}
                    disabled={loading}
                    icon={Check}
                  >
                    เสร็จสิ้น
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="lg"
                  className="flex-1 font-semibold"
                  onClick={() => void startRecording()}
                  disabled={loading || !orderNo || !previewReady}
                  icon={Circle}
                >
                  เริ่มอัดวิดีโอ
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={resetStation}
                  disabled={loading || !orderNo}
                >
                  ล้าง
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface p-2.5 shadow-sm sm:p-3">
          {orderNo ? (
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-contain"
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute top-0 left-0 h-px w-px opacity-0"
                aria-hidden
              />
              {overlay?.enabled && previewReady && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pt-12 pb-4 text-white">
                  <p className="text-lg font-semibold tracking-tight sm:text-xl">{orderNo}</p>
                  <p className="mt-1 text-[11px] text-white/85 sm:text-xs">
                    {station.code} · {overlay.employeeName} · {overlay.tenantSlug}
                  </p>
                  <p className="tabular text-[11px] text-white/70 sm:text-xs">
                    {clock}
                    {recording ? " · REC" : ""}
                    {" · burn-in ในไฟล์"}
                  </p>
                </div>
              )}
              {!previewReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 text-sm text-white/80">
                  <Spinner className="text-white/60" size={22} />
                  รออนุญาตกล้อง / กำลังเปิดกล้อง…
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[9rem] flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-line bg-subtle/50 p-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-muted shadow-xs ring-1 ring-line">
                <ScanLine size={20} strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">พร้อมรับออเดอร์</p>
                <p className="mt-1 text-[13px] text-muted">
                  สแกนบาร์โค้ดเพื่อเปิดกล้องและเริ่มบันทึก
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthPill({
  label,
  status,
  icon: Icon,
}: {
  label: string;
  status: "ok" | "warn" | "error";
  icon: LucideIcon;
}) {
  const styles = {
    ok: "bg-success-soft text-success-ink ring-success/20",
    warn: "bg-warning-soft text-warning-ink ring-warning/25",
    error: "bg-danger-soft text-danger-ink ring-danger/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        styles[status],
      )}
    >
      <Icon size={12} strokeWidth={2.2} />
      {label}
    </span>
  );
}

import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadRecordingFile } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-ก-๙]+/gi, "_").replace(/_+/g, "_").slice(0, 120) || "camera";
}

function extFromMime(mime: string, kind: string) {
  if (kind === "snapshot") return "jpg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  return "webm";
}

/** Legacy multipart upload (local/dev). Prefer /upload/sign + /upload/complete on Vercel. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  try {
    const { tenant: tenantSlug } = await params;
    const session = await requireTenantSession();

    if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
      return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
    }

    if (!can(session.role, "recording.stop") && !can(session.role, "recording.start")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์อัปโหลด" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const recordingId = String(form.get("recordingId") || "");
    const cameraLabel = String(form.get("cameraLabel") || "camera");
    const kind = String(form.get("kind") || "video");

    if (!(file instanceof Blob) || !recordingId) {
      return NextResponse.json({ error: "ต้องมี file และ recordingId" }, { status: 400 });
    }

    const recording = await prisma.recording.findFirst({
      where: { id: recordingId, tenantId: session.tenantId },
    });
    if (!recording) {
      return NextResponse.json({ error: "ไม่พบ recording" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length < 100) {
      return NextResponse.json({ error: "ไฟล์วิดีโอว่างหรือสั้นเกินไป" }, { status: 400 });
    }

    const mimeType = file.type || (kind === "snapshot" ? "image/jpeg" : "video/webm");
    const ext = extFromMime(mimeType, kind);
    const filename = `${sanitizeFilename(cameraLabel)}.${ext}`;
    const localMirror = `local:${session.tenantId}/${recordingId}/${filename}`;

    const uploaded = await uploadRecordingFile({
      tenantId: session.tenantId,
      recordingId,
      filename,
      mimeType,
      buffer,
    });

    if (kind === "snapshot") {
      const snapshot = await prisma.snapshot.create({
        data: {
          recordingId,
          storagePath: uploaded.storagePath,
          sha256: uploaded.sha256,
        },
      });
      return NextResponse.json({
        ok: true,
        snapshot,
        storagePath: uploaded.storagePath,
        previewUrl: uploaded.previewUrl,
        storageError: uploaded.storageError ?? null,
      });
    }

    const recordingFile = await prisma.recordingFile.create({
      data: {
        recordingId,
        cameraLabel,
        storagePath: uploaded.storagePath,
        sizeBytes: uploaded.sizeBytes,
        sha256: uploaded.sha256,
        thumbnailPath: uploaded.storagePath.startsWith("local:")
          ? uploaded.storagePath
          : localMirror,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: "upload.completed",
        entityType: "recording_file",
        entityId: recordingFile.id,
        meta: JSON.stringify({
          storagePath: uploaded.storagePath,
          sizeBytes: uploaded.sizeBytes,
          previewUrl: uploaded.previewUrl,
          storageError: uploaded.storageError,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      file: recordingFile,
      previewUrl: uploaded.previewUrl,
      storagePath: uploaded.storagePath,
      storageError: uploaded.storageError ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ";
    console.error("[upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

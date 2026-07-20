import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToGoogleDrive } from "@/lib/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
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
  const kind = String(form.get("kind") || "video"); // video | snapshot

  if (!(file instanceof File) || !recordingId) {
    return NextResponse.json({ error: "ต้องมี file และ recordingId" }, { status: 400 });
  }

  const recording = await prisma.recording.findFirst({
    where: { id: recordingId, tenantId: session.tenantId },
  });
  if (!recording) {
    return NextResponse.json({ error: "ไม่พบ recording" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = kind === "snapshot" ? "jpg" : "mp4";
  const mimeType = file.type || (kind === "snapshot" ? "image/jpeg" : "video/mp4");
  const filename = `${cameraLabel.replace(/\s+/g, "_")}.${ext}`;

  const uploaded = await uploadToGoogleDrive({
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
    return NextResponse.json({ ok: true, snapshot, driveFileId: uploaded.fileId });
  }

  const recordingFile = await prisma.recordingFile.create({
    data: {
      recordingId,
      cameraLabel,
      storagePath: uploaded.storagePath,
      sizeBytes: uploaded.sizeBytes,
      sha256: uploaded.sha256,
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
        driveFileId: uploaded.fileId,
        sizeBytes: uploaded.sizeBytes,
      }),
    },
  });

  return NextResponse.json({
    ok: true,
    file: recordingFile,
    driveFileId: uploaded.fileId,
    webViewLink: uploaded.webViewLink,
  });
}

import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSignedUrl, supabaseRefFromStorage } from "@/lib/storage";
import { checkStorageAlert } from "@/lib/alerts";
import { syncUsageMeter } from "@/lib/tenant-limits";

export const runtime = "nodejs";

/** Register a file that was uploaded directly to Supabase via signed URL. */
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

    const body = (await req.json()) as {
      recordingId?: string;
      cameraLabel?: string;
      storagePath?: string;
      sizeBytes?: number;
      kind?: string;
      contentType?: string;
    };

    const recordingId = String(body.recordingId || "");
    const storagePath = String(body.storagePath || "");
    const cameraLabel = String(body.cameraLabel || "camera");
    const sizeBytes = Number(body.sizeBytes || 0);
    const kind = String(body.kind || "video");

    if (!recordingId || !storagePath) {
      return NextResponse.json({ error: "ต้องมี recordingId และ storagePath" }, { status: 400 });
    }

    if (!supabaseRefFromStorage(storagePath)) {
      return NextResponse.json({ error: "storagePath ไม่ถูกต้อง" }, { status: 400 });
    }

    const recording = await prisma.recording.findFirst({
      where: { id: recordingId, tenantId: session.tenantId },
    });
    if (!recording) {
      return NextResponse.json({ error: "ไม่พบ recording" }, { status: 404 });
    }

    const sha256 = createHash("sha256")
      .update(`${storagePath}:${sizeBytes}:${recordingId}`)
      .digest("hex");

    const previewUrl = await createSignedUrl(storagePath, 60 * 60);

    if (kind === "snapshot") {
      const snapshot = await prisma.snapshot.create({
        data: {
          recordingId,
          storagePath,
          sha256,
        },
      });
      return NextResponse.json({ ok: true, snapshot, previewUrl, storagePath });
    }

    const recordingFile = await prisma.recordingFile.create({
      data: {
        recordingId,
        cameraLabel,
        storagePath,
        sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
        sha256,
      },
    });

    if (kind === "video") {
      await syncUsageMeter(session.tenantId);
      await checkStorageAlert(session.tenantId);
    }

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        action: "upload.completed",
        entityType: "recording_file",
        entityId: recordingFile.id,
        meta: JSON.stringify({
          storagePath,
          sizeBytes,
          previewUrl,
          via: "signed-upload",
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      file: recordingFile,
      previewUrl,
      storagePath,
      storageError: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "บันทึกไฟล์ไม่สำเร็จ";
    console.error("[upload/complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

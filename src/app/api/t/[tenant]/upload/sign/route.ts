import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSignedUpload, sanitizeStorageFilename } from "@/lib/storage";

export const runtime = "nodejs";

function extFromMime(mime: string) {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  return "webm";
}

/** Issue a signed upload URL so the browser uploads straight to Supabase (avoids Vercel body limit). */
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
      contentType?: string;
      filename?: string;
    };

    const recordingId = String(body.recordingId || "");
    const cameraLabel = String(body.cameraLabel || "camera");
    const contentType = String(body.contentType || "video/webm");

    if (!recordingId) {
      return NextResponse.json({ error: "ต้องมี recordingId" }, { status: 400 });
    }

    const recording = await prisma.recording.findFirst({
      where: { id: recordingId, tenantId: session.tenantId },
    });
    if (!recording) {
      return NextResponse.json({ error: "ไม่พบ recording" }, { status: 404 });
    }

    const ext = extFromMime(contentType);
    const rawName = body.filename?.trim() || `${cameraLabel}.${ext}`;
    const withExt = rawName.includes(".") ? rawName : `${rawName}.${ext}`;
    const filename = sanitizeStorageFilename(withExt);

    const signed = await createSignedUpload({
      tenantId: session.tenantId,
      recordingId,
      filename,
    });

    return NextResponse.json({
      ok: true,
      ...signed,
      contentType,
      cameraLabel,
      filename,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "สร้าง upload URL ไม่สำเร็จ";
    console.error("[upload/sign]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

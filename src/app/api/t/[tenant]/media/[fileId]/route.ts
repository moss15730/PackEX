import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSignedUrl, localPathFromStorage } from "@/lib/storage";

export const runtime = "nodejs";

function mimeFromPath(filePath: string) {
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".webm")) return "video/webm";
  if (filePath.endsWith(".mov")) return "video/quicktime";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenant: string; fileId: string }> },
) {
  const { tenant: tenantSlug, fileId } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const file = await prisma.recordingFile.findFirst({
    where: {
      id: fileId,
      recording: { tenantId: session.tenantId },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 404 });
  }

  // Prefer Supabase signed URL when available
  if (file.storagePath.startsWith("supabase:")) {
    const signed = await createSignedUrl(file.storagePath, 60 * 60);
    if (signed) {
      return NextResponse.redirect(signed, 302);
    }
  }

  const candidates = [file.thumbnailPath, file.storagePath].filter(Boolean) as string[];
  let diskPath: string | null = null;
  for (const candidate of candidates) {
    const resolved = localPathFromStorage(candidate);
    if (resolved && existsSync(resolved)) {
      diskPath = resolved;
      break;
    }
  }

  if (!diskPath) {
    return NextResponse.json(
      { error: "ไม่พบไฟล์วิดีโอบนเซิร์ฟเวอร์" },
      { status: 404 },
    );
  }

  const stat = statSync(diskPath);
  const mime = mimeFromPath(diskPath);
  const range = req.headers.get("range");

  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : Math.min(start + 1024 * 1024 - 1, stat.size - 1);
      const chunkSize = end - start + 1;
      const stream = createReadStream(diskPath, { start, end });
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": mime,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }

  const stream = createReadStream(diskPath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

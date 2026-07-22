import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadStorageBytes, sha256OfBuffer } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  if (!can(session.role, "video.view")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ตรวจ hash" }, { status: 403 });
  }

  const recording = await prisma.recording.findFirst({
    where: { id, tenantId: session.tenantId, status: { not: "deleted" } },
    include: {
      files: true,
      snapshots: true,
    },
  });

  if (!recording) {
    return NextResponse.json({ error: "ไม่พบวิดีโอ" }, { status: 404 });
  }

  const results: {
    kind: "video" | "snapshot";
    id: string;
    label: string;
    expected: string;
    actual: string | null;
    match: boolean;
    error?: string;
  }[] = [];

  for (const file of recording.files) {
    try {
      const bytes = await downloadStorageBytes(file.storagePath);
      if (!bytes) {
        results.push({
          kind: "video",
          id: file.id,
          label: file.cameraLabel,
          expected: file.sha256,
          actual: null,
          match: false,
          error: "ดาวน์โหลดไฟล์ไม่ได้",
        });
        continue;
      }
      const actual = sha256OfBuffer(bytes);
      results.push({
        kind: "video",
        id: file.id,
        label: file.cameraLabel,
        expected: file.sha256,
        actual,
        match: actual === file.sha256,
      });
    } catch (err) {
      results.push({
        kind: "video",
        id: file.id,
        label: file.cameraLabel,
        expected: file.sha256,
        actual: null,
        match: false,
        error: err instanceof Error ? err.message : "verify failed",
      });
    }
  }

  for (const snap of recording.snapshots) {
    try {
      const bytes = await downloadStorageBytes(snap.storagePath);
      if (!bytes) {
        results.push({
          kind: "snapshot",
          id: snap.id,
          label: "snapshot",
          expected: snap.sha256,
          actual: null,
          match: false,
          error: "ดาวน์โหลดไฟล์ไม่ได้",
        });
        continue;
      }
      const actual = sha256OfBuffer(bytes);
      results.push({
        kind: "snapshot",
        id: snap.id,
        label: "snapshot",
        expected: snap.sha256,
        actual,
        match: actual === snap.sha256,
      });
    } catch (err) {
      results.push({
        kind: "snapshot",
        id: snap.id,
        label: "snapshot",
        expected: snap.sha256,
        actual: null,
        match: false,
        error: err instanceof Error ? err.message : "verify failed",
      });
    }
  }

  const allMatch = results.length > 0 && results.every((r) => r.match);

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.id,
      action: "video.verify_hash",
      entityType: "recording",
      entityId: recording.id,
      meta: JSON.stringify({ allMatch, count: results.length }),
    },
  });

  return NextResponse.json({ ok: true, allMatch, results });
}

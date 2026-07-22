import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { downloadStorageBytes } from "@/lib/storage";

function extFromPath(storagePath: string, fallback: string) {
  const base = storagePath.split("/").pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot > 0) return base.slice(dot);
  return fallback;
}

export async function buildClaimPackageZip(opts: {
  tenantId: string;
  claimId: string;
}) {
  const claim = await prisma.claimCase.findFirst({
    where: { id: opts.claimId, tenantId: opts.tenantId },
    include: {
      order: true,
      claimReason: true,
      packages: {
        include: {
          recording: {
            include: {
              files: true,
              snapshots: true,
              markers: true,
              station: true,
              employee: { select: { id: true, name: true, employeeCode: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!claim) return null;

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      tenantId: opts.tenantId,
      OR: [
        { entityType: "claim_case", entityId: claim.id },
        {
          entityType: "recording",
          entityId: { in: claim.packages.map((p) => p.recordingId) },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const zip = new JSZip();

  const manifest = {
    generatedAt: new Date().toISOString(),
    claim: {
      id: claim.id,
      status: claim.status,
      reason: claim.reason,
      reasonLabel: claim.claimReason?.label ?? claim.reason,
      createdAt: claim.createdAt.toISOString(),
    },
    order: {
      id: claim.order.id,
      orderNo: claim.order.orderNo,
      trackingNo: claim.order.trackingNo,
      source: claim.order.source,
      itemSummary: claim.order.itemSummary,
    },
    recordings: claim.packages.map((pkg) => {
      const rec = pkg.recording;
      return {
        id: rec.id,
        status: rec.status,
        legalHold: rec.legalHold,
        completenessScore: rec.completenessScore,
        startedAt: rec.startedAt.toISOString(),
        endedAt: rec.endedAt?.toISOString() ?? null,
        durationSec: rec.durationSec,
        station: { id: rec.station.id, code: rec.station.code, name: rec.station.name },
        employee: rec.employee,
        files: rec.files.map((f) => ({
          id: f.id,
          cameraLabel: f.cameraLabel,
          sizeBytes: f.sizeBytes,
          sha256: f.sha256,
          storagePath: f.storagePath,
        })),
        snapshots: rec.snapshots.map((s) => ({
          id: s.id,
          sha256: s.sha256,
          takenAt: s.takenAt.toISOString(),
          storagePath: s.storagePath,
        })),
        markers: rec.markers.map((m) => ({
          label: m.label,
          atSec: m.atSec,
          kind: m.kind,
        })),
      };
    }),
    audit: auditLogs.map((log) => ({
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      meta: log.meta,
      createdAt: log.createdAt.toISOString(),
    })),
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file(
    "README.txt",
    [
      "PackEX Claim Package",
      `Order: ${claim.order.orderNo}`,
      `Claim: ${claim.id}`,
      `Generated: ${manifest.generatedAt}`,
      "",
      "Contents:",
      "- manifest.json — metadata, SHA-256 hashes, audit excerpt",
      "- recordings/<id>/ — video files and snapshots",
      "",
      "Verify integrity by hashing each media file and comparing to sha256 in manifest.json.",
    ].join("\n"),
  );

  for (const pkg of claim.packages) {
    const rec = pkg.recording;
    const folder = zip.folder(`recordings/${rec.id}`);
    if (!folder) continue;

    folder.file(
      "recording.json",
      JSON.stringify(manifest.recordings.find((r) => r.id === rec.id), null, 2),
    );

    for (const file of rec.files) {
      const bytes = await downloadStorageBytes(file.storagePath);
      if (!bytes) {
        folder.file(
          `MISSING-${file.cameraLabel}.txt`,
          `Could not download ${file.storagePath}\nsha256=${file.sha256}`,
        );
        continue;
      }
      const ext = extFromPath(file.storagePath, ".webm");
      const safeLabel = file.cameraLabel.replace(/[^a-zA-Z0-9._-]+/g, "_") || "camera";
      folder.file(`video-${safeLabel}${ext}`, bytes);
    }

    for (const [i, snap] of rec.snapshots.entries()) {
      const bytes = await downloadStorageBytes(snap.storagePath);
      if (!bytes) {
        folder.file(`MISSING-snapshot-${i + 1}.txt`, `sha256=${snap.sha256}`);
        continue;
      }
      const ext = extFromPath(snap.storagePath, ".jpg");
      folder.file(`snapshot-${i + 1}${ext}`, bytes);
    }
  }

  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const filename = `packex-claim-${claim.order.orderNo}-${claim.id.slice(0, 8)}.zip`;
  return { data, filename, claim };
}

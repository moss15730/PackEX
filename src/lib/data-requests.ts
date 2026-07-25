import { prisma } from "@/lib/db";

export const DATA_REQUEST_TYPES = ["export", "deletion"] as const;
export const DATA_REQUEST_STATUSES = ["pending", "processing", "completed", "rejected"] as const;

export type DataRequestType = (typeof DATA_REQUEST_TYPES)[number];
export type DataRequestStatus = (typeof DATA_REQUEST_STATUSES)[number];

export function dataRequestTypeLabel(type: string) {
  return type === "export" ? "ส่งออกข้อมูล" : type === "deletion" ? "ลบข้อมูล" : type;
}

export function dataRequestStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "รอดำเนินการ",
    processing: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    rejected: "ปฏิเสธ",
  };
  return map[status] ?? status;
}

/**
 * Full tenant data export for PDPA subject-access requests.
 * Personal data is included by design; media stays as storage references so the
 * payload is a manifest rather than a multi-gigabyte blob.
 */
export async function buildTenantDataExport(tenantId: string) {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      settings: true,
      subscription: { include: { plan: true } },
      usageMeters: true,
      invoices: { orderBy: { issuedAt: "desc" } },
    },
  });

  const [users, stations, recordings, claims, shareLinks, auditLogs, alerts] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,
        status: true,
        stationAccess: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.station.findMany({
      where: { tenantId },
      include: { cameras: true, agent: true },
      orderBy: { code: "asc" },
    }),
    prisma.recording.findMany({
      where: { tenantId },
      include: {
        order: true,
        station: { select: { code: true, name: true } },
        employee: { select: { employeeCode: true, name: true, email: true } },
        files: {
          select: {
            id: true,
            cameraLabel: true,
            storagePath: true,
            sizeBytes: true,
            sha256: true,
            createdAt: true,
          },
        },
        markers: true,
        snapshots: { select: { id: true, storagePath: true, takenAt: true } },
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.claimCase.findMany({
      where: { tenantId },
      include: { order: true, packages: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shareLink.findMany({
      where: { tenantId },
      select: {
        id: true,
        token: true,
        recordingId: true,
        expiresAt: true,
        openCount: true,
        maxOpens: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.alert.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      format: "packex-tenant-export/v1",
      note: "ไฟล์วิดีโออ้างอิงด้วย storagePath และ sha256 — ขอไฟล์จริงได้จากทีมงาน",
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      createdAt: tenant.createdAt,
      settings: tenant.settings,
      subscription: tenant.subscription,
      usage: tenant.usageMeters,
      invoices: tenant.invoices,
    },
    users,
    stations,
    recordings,
    claims,
    shareLinks,
    alerts,
    auditLogs,
    counts: {
      users: users.length,
      stations: stations.length,
      recordings: recordings.length,
      claims: claims.length,
      shareLinks: shareLinks.length,
      auditLogs: auditLogs.length,
    },
  };
}

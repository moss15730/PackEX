import { prisma } from "./db";
import { getUsageAndLimits } from "./tenant-limits";
import { ensureTenantAnnouncementAlerts } from "./announcements";

type AlertInput = {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
};

async function upsertRecentAlert(tenantId: string, title: string, input: AlertInput) {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.alert.findFirst({
    where: {
      tenantId,
      title,
      acknowledged: false,
      createdAt: { gte: dayAgo },
    },
  });

  if (existing) {
    return prisma.alert.update({
      where: { id: existing.id },
      data: { message: input.message, severity: input.severity },
    });
  }

  return prisma.alert.create({
    data: { tenantId, ...input },
  });
}

export async function checkStorageAlert(tenantId: string) {
  const { limits, usage } = await getUsageAndLimits(tenantId);
  if (!limits) return;

  const pct = (usage.storageUsedGb / limits.maxStorageGb) * 100;

  if (pct >= 95) {
    await upsertRecentAlert(tenantId, "พื้นที่เก็บวิดีโอใกล้เต็ม", {
      severity: "critical",
      title: "พื้นที่เก็บวิดีโอใกล้เต็ม",
      message: `ใช้ไป ${usage.storageUsedGb.toFixed(1)}/${limits.maxStorageGb} GB (${pct.toFixed(0)}%) — ไม่สามารถอัดวิดีโอใหม่ได้เมื่อเต็ม`,
    });
  } else if (pct >= 80) {
    await upsertRecentAlert(tenantId, "พื้นที่เก็บวิดีโอใกล้เต็ม", {
      severity: "warning",
      title: "พื้นที่เก็บวิดีโอใกล้เต็ม",
      message: `ใช้ไป ${usage.storageUsedGb.toFixed(1)}/${limits.maxStorageGb} GB (${pct.toFixed(0)}%) — พิจารณาลบวิดีโอเก่าหรืออัปเกรดแพ็กเกจ`,
    });
  }
}

export async function alertLowCompleteness(
  tenantId: string,
  recordingId: string,
  orderNo: string,
  score: number,
) {
  if (score >= 70) return;

  await upsertRecentAlert(tenantId, `วิดีโอคุณภาพต่ำ: ${orderNo}`, {
    severity: score < 50 ? "critical" : "warning",
    title: `วิดีโอคุณภาพต่ำ: ${orderNo}`,
    message: `คะแนนครบถ้วน ${score}% — ตรวจสอบการอัด recording ${recordingId.slice(-8)}`,
  });
}

export async function checkStationAlerts(tenantId: string) {
  const offlineStations = await prisma.station.findMany({
    where: {
      tenantId,
      status: { in: ["offline", "blocked", "disk_full", "camera_error"] },
    },
    select: { code: true, name: true, status: true },
  });

  for (const station of offlineStations) {
    const title = `สถานี ${station.code} มีปัญหา`;
    await upsertRecentAlert(tenantId, title, {
      severity: station.status === "disk_full" ? "critical" : "warning",
      title,
      message: `${station.name} — สถานะ: ${station.status}`,
    });
  }
}

export async function syncTenantAlerts(tenantId: string) {
  await Promise.all([
    checkStorageAlert(tenantId),
    checkStationAlerts(tenantId),
    ensureTenantAnnouncementAlerts(tenantId),
  ]);
}

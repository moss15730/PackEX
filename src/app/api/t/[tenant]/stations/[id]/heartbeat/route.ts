import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type HeartbeatBody = {
  version?: string;
  cpuPercent?: number;
  diskFreeGb?: number;
  queueSize?: number;
  timeDriftMs?: number;
  online?: boolean;
};

async function authorizeHeartbeat(
  req: Request,
  tenantSlug: string,
  stationId: string,
) {
  const agentKey = req.headers.get("x-packex-agent-key");
  const expected = process.env.STATION_AGENT_KEY;

  if (agentKey && expected && agentKey === expected) {
    const station = await prisma.station.findFirst({
      where: { id: stationId, tenant: { slug: tenantSlug } },
      select: { id: true, tenantId: true, status: true },
    });
    if (!station) return { error: "ไม่พบสถานี", status: 404 as const };
    return { station, via: "agent-key" as const };
  }

  const session = await requireTenantSession();
  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return { error: "ไม่ได้รับอนุญาต", status: 401 as const };
  }
  if (
    !can(session.role, "stations.manage") &&
    !can(session.role, "recording.start")
  ) {
    return { error: "ไม่มีสิทธิ์ส่ง heartbeat", status: 403 as const };
  }

  const station = await prisma.station.findFirst({
    where: { id: stationId, tenantId: session.tenantId },
    select: { id: true, tenantId: true, status: true },
  });
  if (!station) return { error: "ไม่พบสถานี", status: 404 as const };
  return { station, via: "session" as const, session };
}

function deriveStationStatus(opts: {
  current: string;
  online: boolean;
  diskFreeGb: number | null;
}): string {
  if (opts.current === "recording" || opts.current === "uploading" || opts.current === "syncing") {
    return opts.current;
  }
  if (opts.current === "disabled" || opts.current === "blocked") {
    return opts.current;
  }
  if (!opts.online) return "offline";
  if (opts.diskFreeGb != null && opts.diskFreeGb < 5) return "disk_full";
  if (opts.diskFreeGb != null && opts.diskFreeGb < 20) return "warning";
  if (opts.current === "offline" || opts.current === "disk_full" || opts.current === "camera_error") {
    return "ready";
  }
  if (opts.current === "idle" || opts.current === "ready" || opts.current === "warning") {
    return opts.diskFreeGb != null && opts.diskFreeGb < 20 ? "warning" : opts.current === "idle" ? "idle" : "ready";
  }
  return opts.current;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string; id: string }> },
) {
  const { tenant: tenantSlug, id: stationId } = await params;
  const auth = await authorizeHeartbeat(req, tenantSlug, stationId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as HeartbeatBody;
  const online = body.online ?? true;
  const diskFreeGb =
    body.diskFreeGb === undefined || body.diskFreeGb === null
      ? null
      : Number(body.diskFreeGb);
  const cpuPercent =
    body.cpuPercent === undefined || body.cpuPercent === null
      ? null
      : Number(body.cpuPercent);
  const queueSize =
    body.queueSize === undefined || body.queueSize === null
      ? 0
      : Math.max(0, Math.trunc(Number(body.queueSize)));
  const timeDriftMs =
    body.timeDriftMs === undefined || body.timeDriftMs === null
      ? 0
      : Math.trunc(Number(body.timeDriftMs));
  const version = String(body.version || "0.1.0").slice(0, 32);

  const nextStatus = deriveStationStatus({
    current: auth.station.status,
    online,
    diskFreeGb: Number.isFinite(diskFreeGb as number) ? diskFreeGb : null,
  });

  const agent = await prisma.stationAgent.upsert({
    where: { stationId },
    create: {
      tenantId: auth.station.tenantId,
      stationId,
      version,
      lastHeartbeatAt: new Date(),
      cpuPercent: cpuPercent != null && Number.isFinite(cpuPercent) ? cpuPercent : null,
      diskFreeGb: diskFreeGb != null && Number.isFinite(diskFreeGb) ? diskFreeGb : null,
      queueSize,
      timeDriftMs,
      online,
    },
    update: {
      version,
      lastHeartbeatAt: new Date(),
      cpuPercent: cpuPercent != null && Number.isFinite(cpuPercent) ? cpuPercent : null,
      diskFreeGb: diskFreeGb != null && Number.isFinite(diskFreeGb) ? diskFreeGb : null,
      queueSize,
      timeDriftMs,
      online,
    },
  });

  if (nextStatus !== auth.station.status) {
    await prisma.station.update({
      where: { id: stationId },
      data: { status: nextStatus },
    });
  }

  if (diskFreeGb != null && diskFreeGb < 20) {
    await prisma.alert
      .create({
        data: {
          tenantId: auth.station.tenantId,
          severity: diskFreeGb < 5 ? "critical" : "warning",
          title: diskFreeGb < 5 ? "ดิสก์สถานีเต็ม" : "ดิสก์สถานีเหลือน้อย",
          message:
            diskFreeGb < 5
              ? `สถานีเหลือพื้นที่ ${diskFreeGb.toFixed(1)} GB — ห้ามอัดใหม่`
              : `สถานีเหลือพื้นที่ ${diskFreeGb.toFixed(1)} GB`,
        },
      })
      .catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    agentId: agent.id,
    stationStatus: nextStatus,
    receivedAt: new Date().toISOString(),
  });
}

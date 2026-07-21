import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { publishAnnouncement, syncAnnouncementAlerts } from "@/lib/announcements";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    active?: boolean;
    targetAll?: boolean;
    tenantIds?: string[];
  };

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบประกาศ" }, { status: 404 });
  }

  const targetAll =
    typeof body.targetAll === "boolean" ? body.targetAll : existing.targetAll;
  const tenantIds = Array.isArray(body.tenantIds)
    ? [...new Set(body.tenantIds.filter((tenantId) => typeof tenantId === "string" && tenantId.trim()))]
    : undefined;

  if (!targetAll && tenantIds !== undefined && tenantIds.length === 0) {
    return NextResponse.json({ error: "กรุณาเลือกอย่างน้อย 1 องค์กร" }, { status: 400 });
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(body.title?.trim() ? { title: body.title.trim() } : {}),
      ...(body.body?.trim() ? { body: body.body.trim() } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      ...(typeof body.targetAll === "boolean" ? { targetAll } : {}),
    },
  });

  if (typeof body.targetAll === "boolean" || tenantIds !== undefined) {
    const selectedTenantIds =
      tenantIds ??
      (
        await prisma.announcementTarget.findMany({
          where: { announcementId: id },
          select: { tenantId: true },
        })
      ).map((target) => target.tenantId);
    await publishAnnouncement(announcement, selectedTenantIds);
  } else {
    await syncAnnouncementAlerts(announcement);
  }

  const full = await prisma.announcement.findUniqueOrThrow({
    where: { id },
    include: {
      targets: {
        include: { tenant: { select: { id: true, slug: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ ok: true, announcement: full });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.announcement.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

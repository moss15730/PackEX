import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { publishAnnouncement } from "@/lib/announcements";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      targets: {
        include: { tenant: { select: { id: true, slug: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    active?: boolean;
    targetAll?: boolean;
    tenantIds?: string[];
  };

  const title = body.title?.trim();
  const announcementBody = body.body?.trim();
  const targetAll = body.targetAll !== false;
  const tenantIds = Array.isArray(body.tenantIds)
    ? [...new Set(body.tenantIds.filter((id) => typeof id === "string" && id.trim()))]
    : [];

  if (!title || !announcementBody) {
    return NextResponse.json({ error: "กรุณาระบุหัวข้อและเนื้อหา" }, { status: 400 });
  }

  if (!targetAll && tenantIds.length === 0) {
    return NextResponse.json({ error: "กรุณาเลือกอย่างน้อย 1 องค์กร" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      body: announcementBody,
      active: body.active !== false,
      targetAll,
    },
  });

  await publishAnnouncement(announcement, tenantIds);

  const full = await prisma.announcement.findUniqueOrThrow({
    where: { id: announcement.id },
    include: {
      targets: {
        include: { tenant: { select: { id: true, slug: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ ok: true, announcement: full }, { status: 201 });
}

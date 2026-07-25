import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getOrCreateConversation,
  listMessages,
  markRead,
  peerLastReadAt,
  postMessage,
  sanitizeMessage,
} from "@/lib/support-chat";

async function loadTenant(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true, name: true },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  const { tenantId } = await params;
  const tenant = await loadTenant(tenantId);
  if (!tenant) return NextResponse.json({ error: "ไม่พบองค์กร" }, { status: 404 });

  // The admin only "reads" a thread that is actually on screen.
  const shouldMarkRead = new URL(req.url).searchParams.get("open") !== "0";

  const conversation = await getOrCreateConversation(tenantId);
  const messages = await listMessages(conversation.id);

  if (shouldMarkRead && conversation.unreadForAdmin > 0) {
    await markRead(conversation.id, "platform");
  }

  return NextResponse.json({
    tenant,
    messages,
    status: conversation.status,
    // Timestamp of the tenant's last read → drives the admin's "อ่านแล้ว" marker.
    peerLastReadAt: peerLastReadAt(conversation, "platform"),
  });
}

/** Platform admin replies to an organisation. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  const { tenantId } = await params;
  const tenant = await loadTenant(tenantId);
  if (!tenant) return NextResponse.json({ error: "ไม่พบองค์กร" }, { status: 404 });

  const payload = (await req.json().catch(() => ({}))) as { body?: unknown };
  const body = sanitizeMessage(payload.body);

  if (!body) {
    return NextResponse.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
  }

  await postMessage({
    tenantId,
    senderKind: "platform",
    senderId: session.id,
    senderName: session.name,
    body,
  });

  const conversation = await getOrCreateConversation(tenantId);
  const messages = await listMessages(conversation.id);

  return NextResponse.json(
    { ok: true, messages, peerLastReadAt: peerLastReadAt(conversation, "platform") },
    { status: 201 },
  );
}

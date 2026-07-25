import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import {
  getOrCreateConversation,
  listMessages,
  markRead,
  postMessage,
  sanitizeMessage,
} from "@/lib/support-chat";

/**
 * Support chat for organisations.
 *
 * Deliberately NOT gated by `denyIfReadOnly`: reaching support is exactly what a
 * read-only tenant needs to do to get unblocked.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const conversation = await getOrCreateConversation(session.tenantId);
  const messages = await listMessages(conversation.id);

  if (conversation.unreadForTenant > 0) {
    await markRead(conversation.id, "tenant");
  }

  return NextResponse.json({
    messages,
    unread: conversation.unreadForTenant,
    status: conversation.status,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const limited = await checkRateLimit({
    key: `support-chat:${session.tenantId}:${clientIp(req)}`,
    limit: 30,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `ส่งข้อความถี่เกินไป — รอ ${limited.retryAfterSec} วินาที` },
      { status: 429 },
    );
  }

  const payload = (await req.json().catch(() => ({}))) as { body?: unknown };
  const body = sanitizeMessage(payload.body);

  if (!body) {
    return NextResponse.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
  }

  await postMessage({
    tenantId: session.tenantId,
    senderKind: "tenant",
    senderId: session.id,
    senderName: session.name,
    body,
  });

  const conversation = await getOrCreateConversation(session.tenantId);
  const messages = await listMessages(conversation.id);

  return NextResponse.json({ ok: true, messages }, { status: 201 });
}

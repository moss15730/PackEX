import { prisma } from "@/lib/db";

export const MAX_MESSAGE_LENGTH = 2000;

export type ChatMessage = {
  id: string;
  senderKind: "tenant" | "platform";
  senderName: string;
  body: string;
  createdAt: string;
};

/** Every organisation has exactly one thread with platform support. */
export async function getOrCreateConversation(tenantId: string) {
  const existing = await prisma.supportConversation.findUnique({ where: { tenantId } });
  if (existing) return existing;

  return prisma.supportConversation.create({
    data: { tenantId, lastMessageAt: new Date() },
  });
}

export async function listMessages(conversationId: string, limit = 100) {
  const messages = await prisma.supportMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return messages.map(
    (m): ChatMessage => ({
      id: m.id,
      senderKind: m.senderKind === "platform" ? "platform" : "tenant",
      senderName: m.senderName,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    }),
  );
}

export function sanitizeMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const body = raw.trim();
  if (!body) return null;
  return body.slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Appends a message and moves the unread counter to the *other* side.
 * Counters are denormalised so the widget badge and admin inbox stay cheap.
 */
export async function postMessage(opts: {
  tenantId: string;
  senderKind: "tenant" | "platform";
  senderId?: string;
  senderName: string;
  body: string;
}) {
  const conversation = await getOrCreateConversation(opts.tenantId);
  const now = new Date();

  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        senderKind: opts.senderKind,
        senderId: opts.senderId,
        senderName: opts.senderName,
        body: opts.body,
      },
    }),
    prisma.supportConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        status: "open",
        ...(opts.senderKind === "tenant"
          ? { unreadForAdmin: { increment: 1 }, unreadForTenant: 0 }
          : { unreadForTenant: { increment: 1 }, unreadForAdmin: 0 }),
      },
    }),
  ]);

  return message;
}

/** Clears the badge for whichever side just opened the thread. */
export async function markRead(conversationId: string, side: "tenant" | "platform") {
  await prisma.supportConversation.update({
    where: { id: conversationId },
    data: side === "tenant" ? { unreadForTenant: 0 } : { unreadForAdmin: 0 },
  });
}

/** Inbox rows for the platform console, newest activity first. */
export async function listConversationsForAdmin() {
  const conversations = await prisma.supportConversation.findMany({
    orderBy: [{ unreadForAdmin: "desc" }, { lastMessageAt: "desc" }],
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          subscription: { select: { status: true, trialEndsAt: true } },
        },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return conversations.map((c) => ({
    id: c.id,
    tenantId: c.tenantId,
    tenantSlug: c.tenant.slug,
    tenantName: c.tenant.name,
    tenantStatus: c.tenant.status,
    subscriptionStatus: c.tenant.subscription?.status ?? null,
    trialEndsAt: c.tenant.subscription?.trialEndsAt?.toISOString() ?? null,
    status: c.status,
    unreadForAdmin: c.unreadForAdmin,
    lastMessageAt: c.lastMessageAt.toISOString(),
    lastMessage: c.messages[0]
      ? {
          body: c.messages[0].body,
          senderKind: c.messages[0].senderKind,
          senderName: c.messages[0].senderName,
        }
      : null,
  }));
}

import { NextResponse } from "next/server";
import { requirePlatformSession } from "@/lib/auth";
import { listConversationsForAdmin } from "@/lib/support-chat";

/** Inbox: every organisation thread with unread counts. */
export async function GET() {
  const session = await requirePlatformSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  const conversations = await listConversationsForAdmin();
  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadForAdmin, 0);

  return NextResponse.json({ conversations, unreadTotal });
}

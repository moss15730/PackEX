import { redirect } from "next/navigation";
import { Badge, PageHeader } from "@/components/ui";
import { requirePlatformSession } from "@/lib/auth";
import { listConversationsForAdmin } from "@/lib/support-chat";
import { PlatformSupportChat } from "@/components/platform-support-chat";

export const dynamic = "force-dynamic";

export default async function PlatformInboxPage() {
  const session = await requirePlatformSession();
  if (!session) redirect("/login?platform=1");

  const conversations = await listConversationsForAdmin();
  const unread = conversations.reduce((sum, c) => sum + c.unreadForAdmin, 0);

  return (
    <div>
      <PageHeader
        title="กล่องข้อความ"
        description="ข้อความจากองค์กรที่ติดต่อเข้ามาผ่านแชทในแอป — ตอบกลับได้ทันทีจากที่นี่"
        actions={
          unread > 0 ? (
            <Badge tone="danger" dot>
              ยังไม่ได้อ่าน {unread} ข้อความ
            </Badge>
          ) : (
            <Badge tone="success" dot>
              อ่านครบแล้ว
            </Badge>
          )
        }
      />

      <PlatformSupportChat initial={conversations} />
    </div>
  );
}

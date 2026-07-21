import { NextResponse } from "next/server";
import { can, requireTenantSession } from "@/lib/auth";
import { markOnboardingStep } from "@/lib/onboarding";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await params;
  const session = await requireTenantSession();

  if (!session || session.tenantSlug !== tenantSlug || !session.tenantId) {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action?.trim();

  if (action === "camera-tested") {
    if (!can(session.role, "recording.start")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }
    await markOnboardingStep(session.tenantId, "cameraTested");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
}

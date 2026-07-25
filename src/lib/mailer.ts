import { SUPPORT_EMAIL } from "@/lib/contact";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type MailResult =
  | { delivered: true; provider: "resend" }
  | { delivered: false; reason: "not_configured" | "provider_error"; detail?: string };

export function isMailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

/**
 * Sends transactional mail through Resend's REST API (no SDK dependency).
 * When no provider is configured the caller is told so explicitly — reset links
 * are then delivered out-of-band by a platform admin instead of failing silently.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    return { delivered: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        reply_to: SUPPORT_EMAIL,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { delivered: false, reason: "provider_error", detail: detail.slice(0, 200) };
    }

    return { delivered: true, provider: "resend" };
  } catch (error) {
    return {
      delivered: false,
      reason: "provider_error",
      detail: error instanceof Error ? error.message : "unknown",
    };
  }
}

export function passwordResetEmail(resetUrl: string, expiresMinutes: number): MailMessage {
  const text = [
    "คุณ (หรือผู้ดูแลระบบ) ขอรีเซ็ตรหัสผ่าน PackEX",
    "",
    `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ ${expiresMinutes} นาที และใช้ได้ครั้งเดียว):`,
    resetUrl,
    "",
    "ถ้าคุณไม่ได้ขอรีเซ็ต ไม่ต้องดำเนินการใด ๆ รหัสผ่านเดิมยังใช้งานได้ตามปกติ",
    "",
    `ต้องการความช่วยเหลือ: ${SUPPORT_EMAIL}`,
  ].join("\n");

  return {
    to: "",
    subject: "รีเซ็ตรหัสผ่าน PackEX",
    text,
    html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.7;color:#1e2126">
  <p>คุณ (หรือผู้ดูแลระบบ) ขอรีเซ็ตรหัสผ่าน <strong>PackEX</strong></p>
  <p>
    <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#00875a;color:#fff;text-decoration:none;font-weight:600">
      ตั้งรหัสผ่านใหม่
    </a>
  </p>
  <p style="font-size:13px;color:#646b76">ลิงก์ใช้ได้ ${expiresMinutes} นาที และใช้ได้เพียงครั้งเดียว</p>
  <p style="font-size:13px;color:#646b76">ถ้าคุณไม่ได้ขอรีเซ็ต ไม่ต้องดำเนินการใด ๆ</p>
  <p style="font-size:13px;color:#646b76">ต้องการความช่วยเหลือ: ${SUPPORT_EMAIL}</p>
</div>`,
  };
}

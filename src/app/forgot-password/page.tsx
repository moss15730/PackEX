"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { Button, Callout, Field, Input } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/lib/contact";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setSent(true);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aurora flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[25rem]">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <PackExWordmark />
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-7 shadow-lg">
          {sent ? (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success-ink">
                <CheckCircle2 size={24} strokeWidth={1.9} />
              </span>
              <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
                ส่งคำขอแล้ว
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                ถ้าอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว
                ลิงก์มีอายุ 30 นาทีและใช้ได้ครั้งเดียว
              </p>
              <p className="mt-4 text-xs leading-relaxed text-faint">
                ไม่ได้รับอีเมล? ตรวจกล่องสแปม หรือติดต่อผู้ดูแลองค์กรของคุณ / {SUPPORT_EMAIL}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-6 w-full"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                ส่งอีกครั้ง
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-ink">ลืมรหัสผ่าน</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                กรอกอีเมลที่ใช้เข้าระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้
              </p>

              {error ? (
                <Callout tone="danger" className="mt-5">
                  {error}
                </Callout>
              ) : null}

              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field label="อีเมล" htmlFor="email" required>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
                    />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      placeholder="you@company.com"
                      required
                      autoFocus
                    />
                  </div>
                </Field>

                <Button type="submit" size="lg" className="w-full" loading={busy}>
                  ส่งลิงก์รีเซ็ตรหัสผ่าน
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
          >
            <ArrowLeft size={14} />
            กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}

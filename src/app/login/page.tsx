"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PackExWordmark } from "@/components/brand";
import { Button, Card, Field, inputClassName } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const { alert, toast } = useNotify();
  const searchParams = useSearchParams();
  const platformMode = searchParams.get("platform") === "1";

  const [platform, setPlatform] = useState(platformMode);
  const [email, setEmail] = useState(platformMode ? "" : "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          platform,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        await alert({
          title: "เข้าสู่ระบบไม่สำเร็จ",
          description: data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
          tone: "danger",
        });
        return;
      }
      toast({ title: "เข้าสู่ระบบแล้ว", tone: "success" });
      router.push(data.redirect);
      router.refresh();
    } catch {
      await alert({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาลองใหม่อีกครั้ง",
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="warehouse-atmosphere relative flex min-h-screen">
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-12 lg:flex-row lg:items-center lg:gap-16 lg:px-10">
        <div className="hidden flex-1 lg:block">
          <PackExWordmark className="mb-8" />
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight tracking-tight text-[var(--ink)]">
            เข้าสู่ระบบ
            <span className="mt-1 block text-[var(--accent)]">PackEX Ops</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            บันทึกวิดีโอสถานีแพ็ค ตรวจสอบหลักฐาน และจัดการเคลมในที่เดียว
          </p>
        </div>

        <div className="w-full max-w-md lg:ml-auto">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/">
              <PackExWordmark />
            </Link>
          </div>

          <Card className="p-6 sm:p-7">
            <div className="mb-5 flex rounded-[var(--radius-sm)] bg-[var(--surface-2)] p-1">
              <button
                type="button"
                onClick={() => {
                  setPlatform(false);
                  setEmail("");
                  setPassword("");
                }}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition",
                  !platform
                    ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                )}
              >
                องค์กร
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlatform(true);
                  setEmail("");
                  setPassword("");
                }}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition",
                  platform
                    ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                )}
              >
                Platform
              </button>
            </div>

            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
              {platform ? "Platform Admin" : "เข้าสู่ระบบองค์กร"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {platform
                ? "จัดการ tenant, แผน และสุขภาพระบบ"
                : "ลงชื่อเข้าใช้ด้วยอีเมลและรหัสผ่าน"}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="อีเมล">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                  required
                />
              </Field>

              <Field label="รหัสผ่าน">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                  required
                />
              </Field>

              <Button type="submit" variant="primary" className="w-full py-2.5" disabled={loading}>
                {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm">
              <Link href="/" className="text-[var(--muted)] transition hover:text-[var(--ink)]">
                กลับหน้าแรก
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
          กำลังโหลด…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

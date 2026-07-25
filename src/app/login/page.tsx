"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { Button, Field, Input } from "@/components/ui";
import { SegmentedControl } from "@/components/ui-client";
import { useNotify } from "@/components/notify";
import { PageLoading } from "@/components/page-loading";

const HIGHLIGHTS = [
  "บันทึกวิดีโอทุกออเดอร์อัตโนมัติจากสถานีแพ็ค",
  "ตรวจสอบ checksum และ audit log ย้อนหลังได้",
  "แชร์ลิงก์หลักฐานแบบมีวันหมดอายุให้ลูกค้า",
];

function LoginForm() {
  const router = useRouter();
  const { alert, toast } = useNotify();
  const searchParams = useSearchParams();
  const platformMode = searchParams.get("platform") === "1";

  const [mode, setMode] = useState<"tenant" | "platform">(
    platformMode ? "platform" : "tenant",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const platform = mode === "platform";

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
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="aurora relative hidden w-[46%] max-w-2xl flex-col justify-between border-r border-line p-12 lg:flex">
        <Link href="/" className="inline-flex">
          <PackExWordmark size="lg" />
        </Link>

        <div>
          <h1 className="max-w-md text-4xl font-semibold tracking-[-0.03em] text-ink">
            หลักฐานการแพ็ค
            <span className="mt-1 block text-brand">ที่ทีมคุณเชื่อถือได้</span>
          </h1>
          <ul className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-ink-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-ink">
                  <ShieldCheck size={12} strokeWidth={2.4} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted">
          © {new Date().getFullYear()} PackEX · Packing Video Systems
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center bg-canvas px-4 py-10 sm:px-8">
        <div className="w-full max-w-[25rem]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/">
              <PackExWordmark size="md" />
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 shadow-lg sm:p-8">
            <SegmentedControl
              className="w-full"
              value={mode}
              onChange={(next) => {
                setMode(next);
                setEmail("");
                setPassword("");
              }}
              options={[
                { value: "tenant", label: "องค์กร", icon: Building2 },
                { value: "platform", label: "Platform", icon: ShieldCheck },
              ]}
            />

            <h2 className="mt-6 text-xl font-semibold tracking-tight text-ink">
              {platform ? "Platform admin" : "เข้าสู่ระบบองค์กร"}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              {platform
                ? "จัดการ tenant แผนบริการ และสุขภาพระบบ"
                : "ลงชื่อเข้าใช้ด้วยอีเมลและรหัสผ่านของคุณ"}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <Field label="อีเมล" htmlFor="email">
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
                  />
                </div>
              </Field>

              <Field
                label={
                  <span className="flex w-full items-center justify-between gap-2">
                    รหัสผ่าน
                    <Link
                      href="/forgot-password"
                      className="text-xs font-normal text-brand transition hover:underline"
                    >
                      ลืมรหัสผ่าน?
                    </Link>
                  </span>
                }
                htmlFor="password"
              >
                <div className="relative">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-9"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-faint transition hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </Button>
            </form>
          </div>

          <div className="mt-6 space-y-3 text-center">
            {!platform ? (
              <p className="text-sm text-muted">
                ยังไม่มีองค์กร?{" "}
                <Link href="/signup" className="font-medium text-brand transition hover:underline">
                  สมัครทดลองใช้ฟรี
                </Link>
              </p>
            ) : null}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
            >
              <ArrowLeft size={14} />
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PackExWordmark } from "@/components/brand";
import { Button, Card } from "@/components/ui";
import { useNotify } from "@/components/notify";

function LoginForm() {
  const router = useRouter();
  const { alert, toast } = useNotify();
  const searchParams = useSearchParams();
  const platformMode = searchParams.get("platform") === "1";

  const [platform, setPlatform] = useState(platformMode);
  const [email, setEmail] = useState(platformMode ? "admin@packex.app" : "admin@acme.local");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
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
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <PackExWordmark />
          </Link>
        </div>

        <Card className="p-6">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
            {platform ? "Platform Admin" : "เข้าสู่ระบบ"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {platform
              ? "จัดการ tenant, แผน และสุขภาพระบบ"
              : "ลงชื่อเข้าใช้ด้วยอีเมลและรหัสผ่าน"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setPlatform(!platform);
                setEmail(!platform ? "admin@packex.app" : "admin@acme.local");
              }}
              className="text-[var(--accent)] hover:underline"
            >
              {platform ? "เข้าสู่ระบบองค์กร" : "Platform Admin"}
            </button>
            <Link href="/" className="text-[var(--muted)] hover:text-[var(--ink)]">
              กลับหน้าแรก
            </Link>
          </div>
        </Card>

        <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]">
          <p className="font-medium text-[var(--ink)]">Demo credentials</p>
          <p className="mt-1">Org: admin@acme.local / password123</p>
          <p>Platform: admin@packex.app / password123</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">กำลังโหลด…</div>}>
      <LoginForm />
    </Suspense>
  );
}

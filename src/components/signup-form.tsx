"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button, ButtonLink, Callout, Field, Input } from "@/components/ui";

/** Mirrors the server-side slug rule so users see the problem before submitting. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 10, label: "อย่างน้อย 10 ตัวอักษร" },
  { test: (v: string) => /[a-zA-Z]/.test(v), label: "มีตัวอักษร" },
  { test: (v: string) => /[0-9]/.test(v), label: "มีตัวเลข" },
];

export function SignupForm() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ slug: string; endsAt: string; days: number } | null>(null);

  function onOrganizationChange(value: string) {
    setOrganizationName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (PASSWORD_RULES.some((rule) => !rule.test(password))) {
      setError("รหัสผ่านยังไม่ผ่านเงื่อนไขความปลอดภัย");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          slug,
          adminName: adminName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "สมัครไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setDone({
        slug: data.tenant.slug,
        endsAt: data.trial.endsAt,
        days: data.trial.days,
      });
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-7 shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success-ink">
          <CheckCircle2 size={24} strokeWidth={1.9} />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink">
          สร้างองค์กรเรียบร้อย
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          พื้นที่ขององค์กรคุณพร้อมใช้งานที่{" "}
          <span className="font-mono text-ink-2">/t/{done.slug}</span> — เข้าสู่ระบบด้วยอีเมลและ
          รหัสผ่านที่เพิ่งตั้งไว้ได้เลย ทดลองใช้ได้ {done.days} วัน
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" size="lg" iconRight={ArrowRight} onClick={() => router.push("/login")}>
            เข้าสู่ระบบ
          </Button>
          <ButtonLink href="/" variant="secondary" size="lg">
            กลับหน้าแรก
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-7">
      {error ? (
        <Callout tone="danger" className="mb-5">
          {error}
        </Callout>
      ) : null}

      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-ink">
          <Building2 size={17} />
        </span>
        <h2 className="text-[15px] font-semibold text-ink">ข้อมูลองค์กร</h2>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="ชื่อองค์กร" htmlFor="organizationName" required className="sm:col-span-2">
          <Input
            id="organizationName"
            value={organizationName}
            onChange={(e) => onOrganizationChange(e.target.value)}
            placeholder="บริษัท ตัวอย่าง จำกัด"
            required
            autoFocus
          />
        </Field>

        <Field
          label="ชื่อ URL (slug)"
          htmlFor="slug"
          required
          hint={slug ? `จะเข้าใช้งานที่ /t/${slug}` : "a-z, 0-9 และ - เท่านั้น"}
          className="sm:col-span-2"
        >
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="my-warehouse"
            className="font-mono"
            required
          />
        </Field>
      </div>

      <div className="mt-7 border-t border-line pt-6">
        <h2 className="text-[15px] font-semibold text-ink">บัญชีผู้ดูแลองค์กร</h2>
        <p className="mt-1 text-[13px] text-muted">บัญชีนี้จะเป็น Tenant Admin คนแรก</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อ-นามสกุล" htmlFor="adminName" required>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />
          </Field>

          <Field label="อีเมล" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </Field>

          <Field label="รหัสผ่าน" htmlFor="password" required className="sm:col-span-2">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
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
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(password);
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-1.5 text-xs ${
                  passed ? "text-success-ink" : "text-muted"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${passed ? "bg-success" : "bg-line-strong"}`}
                />
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>

      <Button type="submit" size="lg" className="mt-7 w-full" loading={busy} iconRight={ArrowRight}>
        สร้างองค์กรและเริ่มทดลองใช้
      </Button>

      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        การสมัครถือว่ายอมรับ{" "}
        <Link href="/terms" className="text-brand hover:underline">
          ข้อกำหนดการใช้งาน
        </Link>{" "}
        และ{" "}
        <Link href="/privacy" className="text-brand hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
    </form>
  );
}

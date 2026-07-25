"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button, Callout, Field, Input } from "@/components/ui";

const RULES = [
  { test: (v: string) => v.length >= 10, label: "อย่างน้อย 10 ตัวอักษร" },
  { test: (v: string) => /[a-zA-Z]/.test(v), label: "มีตัวอักษรอย่างน้อย 1 ตัว" },
  { test: (v: string) => /[0-9]/.test(v), label: "มีตัวเลขอย่างน้อย 1 ตัว" },
  {
    test: (v: string) =>
      v.length > 0 && !/password|packex|123456|qwerty|admin/i.test(v),
    label: "ไม่มีคำที่เดาง่าย เช่น password หรือ packex",
  },
];

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    if (RULES.some((rule) => !rule.test(password))) {
      setError("รหัสผ่านยังไม่ผ่านเงื่อนไขความปลอดภัย");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
        return;
      }
      setDone(true);
      router.push(data.redirect ?? "/login");
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success-ink">
          <CheckCircle2 size={24} strokeWidth={1.9} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
          ตั้งรหัสผ่านใหม่แล้ว
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">กำลังพาไปหน้าเข้าสู่ระบบ…</p>
      </div>
    );
  }

  return (
    <>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-ink">
        <KeyRound size={20} strokeWidth={1.9} />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">ตั้งรหัสผ่านใหม่</h1>
      <p className="mt-1.5 text-sm text-muted">
        สำหรับบัญชี <span className="font-medium text-ink-2">{email}</span>
      </p>

      {error ? (
        <Callout tone="danger" className="mt-5">
          {error}
        </Callout>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="รหัสผ่านใหม่" htmlFor="password" required>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-faint transition hover:text-ink"
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <ul className="space-y-1.5">
          {RULES.map((rule) => {
            const passed = rule.test(password);
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-2 text-xs ${
                  passed ? "text-success-ink" : "text-muted"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    passed ? "bg-success" : "bg-line-strong"
                  }`}
                />
                {rule.label}
              </li>
            );
          })}
        </ul>

        <Field label="ยืนยันรหัสผ่านใหม่" htmlFor="confirm" required>
          <Input
            id="confirm"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          บันทึกรหัสผ่านใหม่
        </Button>
      </form>
    </>
  );
}

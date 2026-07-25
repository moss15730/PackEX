"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";

export function ShareUnlockForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/share/${token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "ปลดล็อกไม่สำเร็จ");
        return;
      }
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-sm rounded-2xl border border-line bg-surface p-7 text-center shadow-lg"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-ink">
        <Lock size={22} strokeWidth={1.9} />
      </span>

      <h1 className="mt-5 text-lg font-semibold tracking-tight text-ink">
        ลิงก์นี้ป้องกันด้วยรหัสผ่าน
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        กรอกรหัสผ่านที่ได้รับจากผู้ส่งหลักฐานเพื่อดูวิดีโอ
      </p>

      <Field className="mt-6 text-left" error={error}>
        <div className="relative">
          <KeyRound
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
          />
          <Input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            className="pr-10 pl-9"
            placeholder="รหัสผ่าน"
            aria-invalid={Boolean(error)}
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

      <Button type="submit" size="lg" className="mt-5 w-full" loading={busy}>
        {busy ? "กำลังตรวจสอบ…" : "ดูหลักฐาน"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function ShareUnlockForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
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
      className="mx-auto max-w-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]"
    >
      <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
        ลิงก์นี้มีการป้องกันด้วยรหัสผ่าน
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        กรอกรหัสผ่านที่ได้รับจากผู้ส่งหลักฐาน
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoFocus
        className="mt-4 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        placeholder="รหัสผ่าน"
      />
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" className="mt-4 w-full" disabled={busy}>
        {busy ? "กำลังตรวจสอบ…" : "ดูหลักฐาน"}
      </Button>
    </form>
  );
}

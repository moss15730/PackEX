"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { useNotify } from "@/components/notify";
import { statusLabel } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export type ClaimListItem = {
  id: string;
  orderNo: string;
  reason: string;
  status: string;
  createdAt: string;
  packageCount: number;
  hasLegalHold: boolean;
  recordingIds: string[];
};

export type EvidenceOption = {
  id: string;
  orderNo: string;
  stationCode: string;
  status: string;
  startedAt: string;
  completenessScore: number;
};

export type ClaimReasonOption = {
  id: string;
  label: string;
};

export function ClaimsManager({
  tenantSlug,
  canManage,
  claims,
  evidenceOptions,
  reasonOptions,
  initialOrderNo,
  initialRecordingId,
}: {
  tenantSlug: string;
  canManage: boolean;
  claims: ClaimListItem[];
  evidenceOptions: EvidenceOption[];
  reasonOptions: ClaimReasonOption[];
  initialOrderNo?: string;
  initialRecordingId?: string;
}) {
  const router = useRouter();
  const { confirm, alert, toast } = useNotify();
  const [showCreate, setShowCreate] = useState(
    Boolean(initialOrderNo || initialRecordingId),
  );
  const [busy, setBusy] = useState(false);
  const [orderNo, setOrderNo] = useState(initialOrderNo || "");
  const [reasonId, setReasonId] = useState(reasonOptions[0]?.id || "");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialRecordingId ? [initialRecordingId] : [],
  );

  const filteredEvidence = useMemo(() => {
    const q = orderNo.trim().toLowerCase();
    if (!q) return evidenceOptions;
    return evidenceOptions.filter((e) => e.orderNo.toLowerCase().includes(q));
  }, [evidenceOptions, orderNo]);

  async function updateStatus(
    claim: ClaimListItem,
    status: "open" | "reviewing" | "closed",
    releaseLegalHold = false,
  ) {
    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/claims/${claim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, releaseLegalHold }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "อัปเดตเคสไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          tone: "danger",
        });
        return;
      }
      toast({
        title:
          status === "closed"
            ? "ปิดเคสเคลมแล้ว"
            : status === "reviewing"
              ? "เปลี่ยนเป็นกำลังตรวจแล้ว"
              : "เปิดเคสอีกครั้งแล้ว",
        description: releaseLegalHold
          ? `${claim.orderNo} · ยกเลิก Legal Hold แล้ว`
          : claim.orderNo,
        tone: "success",
      });
      router.refresh();
    } catch {
      await alert({
        title: "อัปเดตเคสไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkReviewing(claim: ClaimListItem) {
    await updateStatus(claim, "reviewing", false);
  }

  async function handleClose(claim: ClaimListItem, releaseLegalHold: boolean) {
    const ok = await confirm({
      title: `ปิดเคส ${claim.orderNo}?`,
      description: releaseLegalHold
        ? "ปิดเคสและยกเลิก Legal Hold — วิดีโอหลักฐานอาจถูกลบตาม retention ได้ในภายหลัง"
        : claim.hasLegalHold
          ? "ปิดเคสแต่ยังคง Legal Hold ไว้ — วิดีโอหลักฐานจะยังไม่ถูกลบตาม retention"
          : "ยืนยันปิดเคสเคลมนี้",
      confirmLabel: releaseLegalHold ? "ปิดเคส และยกเลิก Hold" : "ปิดเคส",
      cancelLabel: "ยกเลิก",
      tone: "warning",
    });
    if (!ok) return;
    await updateStatus(claim, "closed", releaseLegalHold);
  }

  async function handleReopen(claim: ClaimListItem) {
    const ok = await confirm({
      title: `เปิดเคส ${claim.orderNo} อีกครั้ง?`,
      description: "สถานะจะกลับเป็นเปิด",
      confirmLabel: "เปิดอีกครั้ง",
      cancelLabel: "ยกเลิก",
      tone: "info",
    });
    if (!ok) return;
    await updateStatus(claim, "open", false);
  }

  function openCreate() {
    setShowCreate(true);
    setReasonId(reasonOptions[0]?.id || "");
    if (!initialOrderNo) setOrderNo("");
    if (!initialRecordingId) setSelectedIds([]);
  }

  function closeCreate() {
    setShowCreate(false);
    setReasonId(reasonOptions[0]?.id || "");
    setOrderNo(initialOrderNo || "");
    setSelectedIds(initialRecordingId ? [initialRecordingId] : []);
  }

  function toggleEvidence(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function pickOrderFromEvidence(nextOrderNo: string) {
    setOrderNo(nextOrderNo);
    setSelectedIds((prev) => {
      const stillValid = prev.filter((id) => {
        const item = evidenceOptions.find((e) => e.id === id);
        return item?.orderNo === nextOrderNo;
      });
      return stillValid;
    });
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo: orderNo.trim(),
          reasonId,
          recordingIds: selectedIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "สร้างเคสเคลมไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          tone: "danger",
        });
        return;
      }
      toast({
        title: "สร้างเคสเคลมแล้ว",
        description: `${orderNo.trim()} · แนบหลักฐาน ${selectedIds.length} วิดีโอ · Legal Hold เปิดแล้ว`,
        tone: "success",
      });
      closeCreate();
      router.refresh();
    } catch {
      await alert({
        title: "สร้างเคสเคลมไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        <strong>Legal Hold:</strong> วิดีโอที่แนบเป็นหลักฐานในเคสเคลมจะไม่ถูกลบตาม retention
        จนกว่าเคสจะปิดและยกเลิก hold
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            สร้างเคสจากเลขออเดอร์ แล้วเลือกวิดีโอแพ็คเป็นหลักฐาน
          </p>
          <Button type="button" onClick={openCreate} disabled={busy || showCreate}>
            สร้างเคสเคลม
          </Button>
        </div>
      )}

      {showCreate && canManage && (
        <Card>
          <h2 className="mb-1 font-semibold text-[var(--ink)]">สร้างเคสเคลมใหม่</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            1) ใส่เลขออเดอร์ · 2) เลือกเหตุผล · 3) เลือกวิดีโอหลักฐาน
          </p>
          {reasonOptions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              ยังไม่มีเหตุผลเคลมในระบบ —{" "}
              <Link
                href={`/t/${tenantSlug}/settings/claim-reasons`}
                className="text-[var(--accent)] hover:underline"
              >
                ไปตั้งค่าเหตุผลเคลม
              </Link>
              <div className="mt-3">
                <Button type="button" variant="outline" onClick={closeCreate}>
                  ปิด
                </Button>
              </div>
            </div>
          ) : (
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  เลขออเดอร์
                </label>
                <input
                  value={orderNo}
                  onChange={(e) => pickOrderFromEvidence(e.target.value)}
                  placeholder="ORD-XXXXX"
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  เหตุผลเคลม
                </label>
                <select
                  value={reasonId}
                  onChange={(e) => setReasonId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                >
                  <option value="" disabled>
                    เลือกเหตุผล
                  </option>
                  {reasonOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  แนบหลักฐานวิดีโอ
                </label>
                <span className="text-xs text-[var(--muted)]">
                  เลือกแล้ว {selectedIds.length} รายการ
                </span>
              </div>

              {filteredEvidence.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                  {orderNo.trim()
                    ? "ไม่พบวิดีโอของออเดอร์นี้ — ตรวจเลขออเดอร์หรืออัดวิดีโอก่อน"
                    : "พิมพ์เลขออเดอร์เพื่อกรองวิดีโอ หรือเลือกจากรายการด้านล่าง"}
                  <div className="mt-2">
                    <Link
                      href={`/t/${tenantSlug}/videos${orderNo.trim() ? `?q=${encodeURIComponent(orderNo.trim())}` : ""}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      ไปหน้าวิดีโอ
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                  {filteredEvidence.map((item) => {
                    const checked = selectedIds.includes(item.id);
                    return (
                      <li key={item.id}>
                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition ${
                            checked
                              ? "bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/40"
                              : "hover:bg-[var(--surface-2)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (!orderNo.trim() || item.orderNo === orderNo.trim()) {
                                if (!orderNo.trim()) setOrderNo(item.orderNo);
                                toggleEvidence(item.id);
                                return;
                              }
                              // ออเดอร์คนละใบ — เริ่มเลือกใหม่ด้วยวิดีโอนี้
                              setOrderNo(item.orderNo);
                              setSelectedIds([item.id]);
                            }}
                            className="mt-1"
                          />
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="font-medium text-[var(--ink)]">
                              {item.orderNo}
                            </span>
                            <span className="text-[var(--muted)]">
                              {" "}
                              · {item.stationCode} ·{" "}
                              {format(new Date(item.startedAt), "d MMM HH:mm", {
                                locale: th,
                              })}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              <Badge
                                tone={item.status === "ready" ? "success" : "neutral"}
                              >
                                {statusLabel(item.status)}
                              </Badge>
                              <Badge
                                tone={
                                  item.completenessScore >= 80 ? "success" : "warning"
                                }
                              >
                                ครบถ้วน {item.completenessScore}%
                              </Badge>
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy || selectedIds.length === 0 || !reasonId}>
                สร้างเคสและใส่ Legal Hold
              </Button>
              <Button type="button" variant="outline" onClick={closeCreate} disabled={busy}>
                ยกเลิก
              </Button>
            </div>
          </form>
          )}
        </Card>
      )}

      <div className="space-y-4">
        {claims.map((claim) => (
          <Card key={claim.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-[var(--ink)]">{claim.orderNo}</h2>
                  <Badge
                    tone={
                      claim.status === "open"
                        ? "warning"
                        : claim.status === "reviewing"
                          ? "info"
                          : "neutral"
                    }
                  >
                    {statusLabel(claim.status)}
                  </Badge>
                  {claim.hasLegalHold && <Badge tone="danger">Legal Hold</Badge>}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{claim.reason}</p>
              </div>
              <time className="text-xs text-[var(--muted)]">
                {format(new Date(claim.createdAt), "d MMM yyyy", { locale: th })}
              </time>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
              <span>หลักฐานวิดีโอ {claim.packageCount} รายการ</span>
              {claim.recordingIds[0] && (
                <Link
                  href={`/t/${tenantSlug}/videos/${claim.recordingIds[0]}`}
                  className="text-[var(--accent)] hover:underline"
                >
                  เปิดวิดีโอหลักฐาน
                </Link>
              )}
            </div>

            {canManage && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                {claim.status !== "closed" && claim.status !== "reviewing" && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-sm"
                    disabled={busy}
                    onClick={() => void handleMarkReviewing(claim)}
                  >
                    กำลังตรวจ
                  </Button>
                )}
                {claim.status !== "closed" && (
                  <>
                    {claim.hasLegalHold ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="text-sm"
                          disabled={busy}
                          onClick={() => void handleClose(claim, false)}
                        >
                          ปิดเคส (เก็บ Hold)
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="text-sm"
                          disabled={busy}
                          onClick={() => void handleClose(claim, true)}
                        >
                          ปิดเคส + ยกเลิก Hold
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        className="text-sm"
                        disabled={busy}
                        onClick={() => void handleClose(claim, false)}
                      >
                        ปิดเคส
                      </Button>
                    )}
                  </>
                )}
                {claim.status === "closed" && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-sm"
                    disabled={busy}
                    onClick={() => void handleReopen(claim)}
                  >
                    เปิดอีกครั้ง
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}

        {claims.length === 0 && !showCreate && (
          <Card>
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              ยังไม่มีเคสเคลม
              {canManage ? " — กด «สร้างเคสเคลม» เพื่อเริ่มต้น" : ""}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

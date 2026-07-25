"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileWarning,
  Film,
  Lock,
  Plus,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  ButtonLink,
  Callout,
  Card,
  EmptyState,
  Field,
  Input,
  Progress,
  Select,
} from "@/components/ui";
import { Modal } from "@/components/ui-client";
import { useNotify } from "@/components/notify";
import { statusLabel, statusTone, cn } from "@/lib/utils";
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

  async function handleDelete(claim: ClaimListItem) {
    const ok = await confirm({
      title: `ลบเคส ${claim.orderNo}?`,
      description: claim.hasLegalHold
        ? "เคสจะถูกลบถาวร และยกเลิก Legal Hold ของวิดีโอหลักฐาน (ถ้าไม่ถูกอ้างอิงในเคสอื่น)"
        : "เคสจะถูกลบถาวร — ไม่สามารถกู้คืนได้",
      confirmLabel: "ลบเคส",
      cancelLabel: "ยกเลิก",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/claims/${claim.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "ลบเคสไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          tone: "danger",
        });
        return;
      }
      toast({
        title: "ลบเคสเคลมแล้ว",
        description: claim.orderNo,
        tone: "success",
      });
      router.refresh();
    } catch {
      await alert({
        title: "ลบเคสไม่สำเร็จ",
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
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
    <div className="space-y-5">
      <Callout tone="warning" icon={Lock} title="Legal hold">
        วิดีโอที่แนบเป็นหลักฐานในเคสเคลมจะไม่ถูกลบตามนโยบาย retention
        จนกว่าเคสจะปิดและยกเลิก hold
      </Callout>

      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            สร้างเคสจากเลขออเดอร์ แล้วเลือกวิดีโอการแพ็คเป็นหลักฐาน
          </p>
          <Button type="button" onClick={openCreate} disabled={busy} icon={Plus}>
            สร้างเคสเคลม
          </Button>
        </div>
      )}

      {claims.length === 0 ? (
        <EmptyState
          icon={FileWarning}
          title="ยังไม่มีเคสเคลม"
          description="เมื่อลูกค้าแจ้งปัญหา สร้างเคสและแนบวิดีโอหลักฐานเพื่อใช้ตรวจสอบย้อนหลัง"
          action={
            canManage ? (
              <Button type="button" onClick={openCreate} icon={Plus}>
                สร้างเคสเคลม
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {claims.map((claim) => (
            <Card key={claim.id} className="flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-ink">
                      {claim.orderNo}
                    </h3>
                    <Badge tone={statusTone(claim.status)} dot>
                      {statusLabel(claim.status)}
                    </Badge>
                    {claim.hasLegalHold && (
                      <Badge tone="danger" icon={Lock}>
                        Legal hold
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] text-muted">{claim.reason}</p>
                </div>
                <time className="shrink-0 text-xs text-faint">
                  {format(new Date(claim.createdAt), "d MMM yyyy", { locale: th })}
                </time>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <Badge icon={Film}>{claim.packageCount} หลักฐาน</Badge>
                {claim.recordingIds[0] && (
                  <ButtonLink
                    href={`/t/${tenantSlug}/videos/${claim.recordingIds[0]}`}
                    variant="ghost"
                    size="sm"
                  >
                    เปิดวิดีโอ
                  </ButtonLink>
                )}
                <ButtonLink
                  href={`/api/t/${tenantSlug}/claims/${claim.id}/export`}
                  variant="ghost"
                  size="sm"
                  icon={Download}
                >
                  Claim package
                </ButtonLink>
              </div>

              {canManage && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  {claim.status !== "closed" && claim.status !== "reviewing" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={ScanSearch}
                      disabled={busy}
                      onClick={() => void handleMarkReviewing(claim)}
                    >
                      กำลังตรวจ
                    </Button>
                  )}
                  {claim.status !== "closed" &&
                    (claim.hasLegalHold ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleClose(claim, false)}
                        >
                          ปิดเคส (เก็บ hold)
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          icon={ShieldAlert}
                          disabled={busy}
                          onClick={() => void handleClose(claim, true)}
                        >
                          ปิด + ยกเลิก hold
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleClose(claim, false)}
                      >
                        ปิดเคส
                      </Button>
                    ))}
                  {claim.status === "closed" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={RotateCcw}
                      disabled={busy}
                      onClick={() => void handleReopen(claim)}
                    >
                      เปิดอีกครั้ง
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="ml-auto text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                    disabled={busy}
                    onClick={() => void handleDelete(claim)}
                  >
                    ลบเคส
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showCreate && canManage}
        onClose={closeCreate}
        title="สร้างเคสเคลมใหม่"
        description="ใส่เลขออเดอร์ เลือกเหตุผล แล้วแนบวิดีโอหลักฐาน"
        icon={FileWarning}
        size="lg"
        footer={
          reasonOptions.length === 0 ? (
            <Button type="button" variant="secondary" onClick={closeCreate}>
              ปิด
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={closeCreate} disabled={busy}>
                ยกเลิก
              </Button>
              <Button
                type="submit"
                form="claim-create"
                loading={busy}
                disabled={selectedIds.length === 0 || !reasonId}
                icon={Lock}
              >
                สร้างเคสและใส่ legal hold
              </Button>
            </>
          )
        }
      >
        {reasonOptions.length === 0 ? (
          <EmptyState
            icon={FileWarning}
            title="ยังไม่มีเหตุผลเคลมในระบบ"
            description="ตั้งค่ารายการเหตุผลก่อน เพื่อให้ทีมเลือกได้อย่างสม่ำเสมอ"
            action={
              <ButtonLink
                href={`/t/${tenantSlug}/settings/claim-reasons`}
                variant="primary"
                size="sm"
              >
                ไปตั้งค่าเหตุผลเคลม
              </ButtonLink>
            }
          />
        ) : (
          <form id="claim-create" onSubmit={submitCreate} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="เลขออเดอร์" required>
                <Input
                  value={orderNo}
                  onChange={(e) => pickOrderFromEvidence(e.target.value)}
                  placeholder="ORD-XXXXX"
                  required
                />
              </Field>
              <Field label="เหตุผลเคลม" required>
                <Select
                  value={reasonId}
                  onChange={(e) => setReasonId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    เลือกเหตุผล
                  </option>
                  {reasonOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-ink">แนบหลักฐานวิดีโอ</span>
                <span className="text-xs text-muted">
                  เลือกแล้ว {selectedIds.length} รายการ
                </span>
              </div>

              {filteredEvidence.length === 0 ? (
                <EmptyState
                  icon={Film}
                  title={
                    orderNo.trim() ? "ไม่พบวิดีโอของออเดอร์นี้" : "ยังไม่ได้เลือกออเดอร์"
                  }
                  description={
                    orderNo.trim()
                      ? "ตรวจสอบเลขออเดอร์อีกครั้ง หรือบันทึกวิดีโอก่อนสร้างเคส"
                      : "พิมพ์เลขออเดอร์เพื่อกรองวิดีโอที่เกี่ยวข้อง"
                  }
                  className="py-10"
                  action={
                    <ButtonLink
                      href={`/t/${tenantSlug}/videos${orderNo.trim() ? `?q=${encodeURIComponent(orderNo.trim())}` : ""}`}
                      variant="secondary"
                      size="sm"
                    >
                      ไปหน้าวิดีโอ
                    </ButtonLink>
                  }
                />
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-line p-2">
                  {filteredEvidence.map((item) => {
                    const checked = selectedIds.includes(item.id);
                    return (
                      <li key={item.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition",
                            checked
                              ? "bg-brand-soft ring-1 ring-brand-border"
                              : "hover:bg-subtle",
                          )}
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
                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-sm font-medium text-ink">
                                {item.orderNo}
                              </span>
                              <span className="text-xs text-muted">
                                {item.stationCode} ·{" "}
                                {format(new Date(item.startedAt), "d MMM HH:mm", {
                                  locale: th,
                                })}
                              </span>
                            </span>
                            <span className="mt-1.5 flex flex-wrap items-center gap-2">
                              <Badge tone={statusTone(item.status)} dot>
                                {statusLabel(item.status)}
                              </Badge>
                              <Progress
                                value={item.completenessScore}
                                tone={item.completenessScore >= 80 ? "brand" : "warning"}
                                className="w-14"
                              />
                              <span className="tabular text-xs text-muted">
                                {item.completenessScore}%
                              </span>
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

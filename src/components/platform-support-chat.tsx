"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Inbox, Loader2, MessageCircle, Send } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { th } from "date-fns/locale";

type ConversationRow = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  unreadForAdmin: number;
  lastMessageAt: string;
  lastMessage: { body: string; senderKind: string; senderName: string } | null;
};

type ChatMessage = {
  id: string;
  senderKind: "tenant" | "platform";
  senderName: string;
  body: string;
  createdAt: string;
};

const POLL_MS = 10000;

function stamp(iso: string) {
  const date = new Date(iso);
  return isToday(date)
    ? format(date, "HH:mm", { locale: th })
    : format(date, "d MMM HH:mm", { locale: th });
}

function planBadge(row: ConversationRow) {
  if (row.tenantStatus === "suspended") return { tone: "danger" as const, label: "ระงับ" };
  if (row.subscriptionStatus === "trial_expired")
    return { tone: "warning" as const, label: "หมดทดลอง" };
  if (row.subscriptionStatus === "trialing") return { tone: "info" as const, label: "ทดลองใช้" };
  if (row.subscriptionStatus === "past_due") return { tone: "warning" as const, label: "ค้างชำระ" };
  return { tone: "success" as const, label: "ใช้งานปกติ" };
}

export function PlatformSupportChat({ initial }: { initial: ConversationRow[] }) {
  const [conversations, setConversations] = useState(initial);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(
    initial[0]?.tenantId ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const active = conversations.find((c) => c.tenantId === activeTenantId) ?? null;

  const refreshInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/support-chat", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: ConversationRow[] };
      setConversations(data.conversations);
    } catch {
      /* next poll retries */
    }
  }, []);

  const loadThread = useCallback(
    async (tenantId: string, opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoadingThread(true);
      try {
        const res = await fetch(`/api/platform/support-chat/${tenantId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { messages: ChatMessage[] };
        setMessages(data.messages);
        setConversations((prev) =>
          prev.map((c) => (c.tenantId === tenantId ? { ...c, unreadForAdmin: 0 } : c)),
        );
      } catch {
        /* next poll retries */
      } finally {
        if (!opts.silent) setLoadingThread(false);
      }
    },
    [],
  );

  // Deferred so selecting a thread never re-renders synchronously from the effect.
  useEffect(() => {
    if (!activeTenantId) return;
    const timer = window.setTimeout(() => void loadThread(activeTenantId), 0);
    return () => window.clearTimeout(timer);
  }, [activeTenantId, loadThread]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshInbox();
      if (activeTenantId) void loadThread(activeTenantId, { silent: true });
    }, POLL_MS);
    return () => window.clearInterval(interval);
  }, [refreshInbox, loadThread, activeTenantId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeTenantId || sending) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/support-chat/${activeTenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "ส่งข้อความไม่สำเร็จ");
        return;
      }
      setMessages(data.messages ?? []);
      setDraft("");
      void refreshInbox();
    } catch {
      setError("ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="ยังไม่มีข้อความจากองค์กร"
        description="เมื่อองค์กรทักผ่านแชทมุมขวาล่างของแอป ข้อความจะเข้ามาที่นี่"
      />
    );
  }

  return (
    <div className="grid gap-4 overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:h-[38rem] lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-0">
      {/* Inbox */}
      <aside className="min-h-0 overflow-y-auto border-line lg:border-r">
        <div className="border-b border-line px-4 py-3">
          <p className="text-[13px] font-medium text-ink">กล่องข้อความ</p>
          <p className="text-xs text-muted">{conversations.length} องค์กร</p>
        </div>
        <ul className="divide-y divide-line">
          {conversations.map((row) => {
            const badge = planBadge(row);
            const isActive = row.tenantId === activeTenantId;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setActiveTenantId(row.tenantId)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition",
                    isActive ? "bg-brand-soft/70" : "hover:bg-subtle/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{row.tenantName}</p>
                      <p className="truncate font-mono text-[11px] text-muted">{row.tenantSlug}</p>
                    </div>
                    {row.unreadForAdmin > 0 ? (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
                        {row.unreadForAdmin > 9 ? "9+" : row.unreadForAdmin}
                      </span>
                    ) : null}
                  </div>

                  {row.lastMessage ? (
                    <p className="mt-1.5 truncate text-xs text-muted">
                      {row.lastMessage.senderKind === "platform" ? "คุณ: " : ""}
                      {row.lastMessage.body}
                    </p>
                  ) : null}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                    <span className="text-[10px] text-faint">{stamp(row.lastMessageAt)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Thread */}
      <section className="flex min-h-0 flex-col">
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-subtle text-muted">
                <Building2 size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{active.tenantName}</p>
                <p className="font-mono text-[11px] text-muted">{active.tenantSlug}</p>
              </div>
              <a
                href={`/platform/tenants`}
                className="text-xs font-medium text-brand transition hover:underline"
              >
                จัดการองค์กร
              </a>
            </header>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 lg:max-h-none"
              style={{ maxHeight: "24rem" }}
            >
              {loadingThread && messages.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-muted" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-center">
                  <MessageCircle size={20} className="text-faint" />
                  <p className="mt-2 text-sm text-muted">ยังไม่มีข้อความในห้องนี้</p>
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.senderKind === "platform";
                  return (
                    <div
                      key={message.id}
                      className={cn("flex flex-col", mine ? "items-end" : "items-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
                          mine
                            ? "rounded-br-sm bg-brand text-brand-ink"
                            : "rounded-bl-sm bg-subtle text-ink",
                        )}
                      >
                        {message.body}
                      </div>
                      <span className="mt-1 px-1 text-[10px] text-faint">
                        {message.senderName} · {stamp(message.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {error ? (
              <p className="border-t border-line bg-danger-soft px-5 py-2 text-xs text-danger-ink">
                {error}
              </p>
            ) : null}

            <form onSubmit={reply} className="flex items-end gap-2 border-t border-line p-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void reply(e);
                  }
                }}
                rows={2}
                maxLength={2000}
                placeholder="ตอบกลับองค์กรนี้… (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
                className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-faint focus:border-brand focus:ring-3 focus:ring-brand/16"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                aria-label="ส่งข้อความ"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink transition hover:bg-brand-hover disabled:opacity-40"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted">เลือกองค์กรจากรายการเพื่อดูข้อความ</p>
          </div>
        )}
      </section>
    </div>
  );
}

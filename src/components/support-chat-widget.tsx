"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Headset, Loader2, MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { th } from "date-fns/locale";

type ChatMessage = {
  id: string;
  senderKind: "tenant" | "platform";
  senderName: string;
  body: string;
  createdAt: string;
};

const POLL_OPEN_MS = 8000;
const POLL_CLOSED_MS = 60000;

function stamp(iso: string) {
  const date = new Date(iso);
  return isToday(date)
    ? format(date, "HH:mm", { locale: th })
    : format(date, "d MMM HH:mm", { locale: th });
}

/**
 * Messenger-style support widget pinned to the bottom-right of every tenant
 * page. Polls rather than holding a socket open: traffic is low and this keeps
 * the app deployable to serverless without extra infrastructure.
 */
export function SupportChatWidget({
  tenantSlug,
  userName,
}: {
  tenantSlug: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        // `open=1` tells the server the panel is visible, so the admin's
        // messages are only marked read when someone is actually looking.
        const res = await fetch(
          `/api/t/${tenantSlug}/support/messages?open=${open ? "1" : "0"}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          messages: ChatMessage[];
          unread: number;
          peerLastReadAt: string | null;
        };
        setMessages(data.messages);
        setPeerReadAt(data.peerLastReadAt);
        setUnread(open ? 0 : data.unread);
        setError("");
      } catch {
        /* transient network failure — next poll retries */
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [tenantSlug, open],
  );

  // Initial fetch, then poll faster while the panel is open.
  // The first call is deferred to a macrotask so the effect never triggers a
  // synchronous re-render of the tree it just mounted into.
  useEffect(() => {
    const initial = window.setTimeout(() => void load({ silent: true }), 0);
    const interval = window.setInterval(
      () => void load({ silent: true }),
      open ? POLL_OPEN_MS : POLL_CLOSED_MS,
    );
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load, open]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/t/${tenantSlug}/support/messages`, {
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
      setPeerReadAt(data.peerLastReadAt ?? null);
      setDraft("");
    } catch {
      setError("ส่งข้อความไม่สำเร็จ — ตรวจการเชื่อมต่อ");
    } finally {
      setSending(false);
    }
  }

  // Messenger-style: the receipt sits under the newest outgoing message only.
  const lastOwnMessage = [...messages].reverse().find((m) => m.senderKind === "tenant") ?? null;
  const lastOwnSeen = Boolean(
    lastOwnMessage &&
      peerReadAt &&
      new Date(peerReadAt).getTime() >= new Date(lastOwnMessage.createdAt).getTime(),
  );

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setUnread(0);
        }}
        aria-label={open ? "ปิดแชทกับผู้ดูแลระบบ" : "เปิดแชทกับผู้ดูแลระบบ"}
        aria-expanded={open}
        className={cn(
          "fixed right-4 bottom-20 z-40 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition",
          "hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6",
          open ? "bg-surface text-ink ring-1 ring-line" : "bg-brand text-brand-ink",
        )}
        style={{ height: "3.25rem", width: "3.25rem" }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {/* Panel */}
      {open ? (
        <div
          className={cn(
            "fixed right-0 bottom-0 z-40 flex w-full flex-col overflow-hidden border border-line bg-surface shadow-xl",
            "h-[70dvh] rounded-t-2xl",
            "sm:right-6 sm:bottom-24 sm:h-[30rem] sm:w-[23rem] sm:rounded-2xl",
          )}
          style={{ animation: "scale-in 200ms var(--ease-out) both" }}
          role="dialog"
          aria-label="แชทกับผู้ดูแลระบบ"
        >
          <header className="flex items-center gap-3 border-b border-line bg-subtle/60 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-ink">
              <Headset size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">ผู้ดูแลระบบ PackEX</p>
              <p className="text-[11px] text-muted">แจ้งปัญหา ขอต่ออายุ หรือสอบถามการใช้งาน</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิดแชท"
              className="rounded-md p-1.5 text-muted transition hover:bg-subtle hover:text-ink"
            >
              <X size={18} />
            </button>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loading && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 size={20} className="animate-spin text-muted" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-ink">
                  <MessageCircle size={20} />
                </span>
                <p className="mt-3 text-sm font-medium text-ink">เริ่มคุยกับผู้ดูแลระบบ</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  พิมพ์ข้อความด้านล่างได้เลย ทีมงานจะตอบกลับในเวลาทำการ
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const mine = message.senderKind === "tenant";
                const isLastOwn = mine && message.id === lastOwnMessage?.id;
                return (
                  <div
                    key={message.id}
                    className={cn("flex flex-col", mine ? "items-end" : "items-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
                        mine
                          ? "rounded-br-sm bg-brand text-brand-ink"
                          : "rounded-bl-sm bg-subtle text-ink",
                      )}
                    >
                      {message.body}
                    </div>
                    <span className="mt-1 flex items-center gap-1 px-1 text-[10px] text-faint">
                      {mine ? "คุณ" : message.senderName} · {stamp(message.createdAt)}
                      {isLastOwn ? (
                        lastOwnSeen ? (
                          <>
                            <CheckCheck size={12} className="text-brand" aria-hidden />
                            <span className="text-brand">อ่านแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Check size={12} aria-hidden />
                            <span>ส่งแล้ว</span>
                          </>
                        )
                      ) : null}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {error ? (
            <p className="border-t border-line bg-danger-soft px-4 py-2 text-xs text-danger-ink">
              {error}
            </p>
          ) : null}

          <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(e);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={`พิมพ์ข้อความ… (${userName})`}
              className="max-h-28 min-h-9.5 flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-faint focus:border-brand focus:ring-3 focus:ring-brand/16"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="ส่งข้อความ"
              className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink transition hover:bg-brand-hover disabled:opacity-40"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

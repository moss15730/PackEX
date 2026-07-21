"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
};

type AlertOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: Tone;
};

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: Tone;
};

type NotifyContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
  toast: (options: {
    title: string;
    description?: string;
    tone?: Tone;
  }) => void;
};

const NotifyContext = createContext<NotifyContextValue | null>(null);

const toneStyles: Record<
  Tone,
  { iconWrap: string; icon: typeof Info; confirmVariant: "primary" | "danger" }
> = {
  info: {
    iconWrap: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    icon: Info,
    confirmVariant: "primary",
  },
  success: {
    iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    icon: CheckCircle2,
    confirmVariant: "primary",
  },
  warning: {
    iconWrap: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    icon: AlertTriangle,
    confirmVariant: "primary",
  },
  danger: {
    iconWrap: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    icon: XCircle,
    confirmVariant: "danger",
  },
};

function DialogShell({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  labelledBy: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="ปิด"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] backdrop-blur-[2px] animate-[backdrop-in_160ms_ease-out]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "relative z-10 w-full max-w-md overflow-hidden rounded-[var(--radius)] border border-[var(--border)]",
          "bg-[var(--surface)] shadow-[var(--shadow-lg)]",
          "animate-[dialog-in_180ms_ease-out]",
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function DialogBody({
  title,
  description,
  tone = "info",
  titleId,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  tone?: Tone;
  titleId: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  const style = toneStyles[tone];
  const Icon = style.icon;

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            style.iconWrap,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-3">
            <h2
              id={titleId}
              className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)]"
            >
              {title}
            </h2>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                aria-label="ปิด"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">{children}</div>
    </div>
  );
}

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type PendingAlert = AlertOptions & {
  resolve: () => void;
};

export function NotifyProvider({ children }: { children: ReactNode }) {
  const confirmTitleId = useId();
  const alertTitleId = useId();
  const [confirmState, setConfirmState] = useState<PendingConfirm | null>(null);
  const [alertState, setAlertState] = useState<PendingAlert | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimers = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (options: { title: string; description?: string; tone?: Tone }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [
        ...prev.slice(-4),
        {
          id,
          title: options.title,
          description: options.description,
          tone: options.tone ?? "info",
        },
      ]);
      const timer = window.setTimeout(() => removeToast(id), 4200);
      toastTimers.current.set(id, timer);
    },
    [removeToast],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({ ...options, resolve });
    });
  }, []);

  function closeConfirm(result: boolean) {
    confirmState?.resolve(result);
    setConfirmState(null);
  }

  function closeAlert() {
    alertState?.resolve();
    setAlertState(null);
  }

  const value: NotifyContextValue = { confirm, alert, toast };

  return (
    <NotifyContext.Provider value={value}>
      {children}

      <DialogShell
        open={Boolean(confirmState)}
        onClose={() => closeConfirm(false)}
        labelledBy={confirmTitleId}
      >
        {confirmState && (
          <DialogBody
            titleId={confirmTitleId}
            title={confirmState.title}
            description={confirmState.description}
            tone={confirmState.tone ?? "warning"}
            onClose={() => closeConfirm(false)}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => closeConfirm(false)}
            >
              {confirmState.cancelLabel ?? "ยกเลิก"}
            </Button>
            <Button
              type="button"
              variant={toneStyles[confirmState.tone ?? "warning"].confirmVariant}
              autoFocus
              onClick={() => closeConfirm(true)}
            >
              {confirmState.confirmLabel ?? "ยืนยัน"}
            </Button>
          </DialogBody>
        )}
      </DialogShell>

      <DialogShell open={Boolean(alertState)} onClose={closeAlert} labelledBy={alertTitleId}>
        {alertState && (
          <DialogBody
            titleId={alertTitleId}
            title={alertState.title}
            description={alertState.description}
            tone={alertState.tone ?? "info"}
            onClose={closeAlert}
          >
            <Button type="button" autoFocus onClick={closeAlert}>
              {alertState.confirmLabel ?? "ตกลง"}
            </Button>
          </DialogBody>
        )}
      </DialogShell>

      {toasts.length > 0 &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex flex-col items-center gap-2 p-4 sm:items-end">
            {toasts.map((item) => {
              const style = toneStyles[item.tone];
              const Icon = style.icon;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius)] border border-[var(--border)]",
                    "bg-[var(--surface)] p-3.5 shadow-[var(--shadow-lg)]",
                    "animate-[toast-in_200ms_ease-out]",
                  )}
                  role="status"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      style.iconWrap,
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--ink)]">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeToast(item.id)}
                    className="rounded-md p-1 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                    aria-label="ปิด"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) {
    throw new Error("useNotify must be used within NotifyProvider");
  }
  return ctx;
}

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Search, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------------------
   Modal — bottom sheet on mobile, centred dialog on desktop
   -------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  icon: Icon,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  icon?: LucideIcon;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'input,textarea,select,button:not([data-close]),[tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const widths = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
  }[size];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        style={{ animation: "fade-in 160ms var(--ease-out) both" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-xl",
          "rounded-t-2xl sm:rounded-2xl",
          widths,
        )}
        style={{ animation: "scale-in 220ms var(--ease-out) both" }}
      >
        {/* drag affordance on mobile */}
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line sm:hidden" />

        <div className="flex items-start gap-3 px-5 pt-4 pb-4 sm:px-6 sm:pt-6">
          {Icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-ink">
              <Icon size={18} strokeWidth={2} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="ปิด"
            className="-mt-1 -mr-1 rounded-md p-1.5 text-muted transition hover:bg-subtle hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-subtle/50 px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/* --------------------------------------------------------------------------
   Segmented control / tabs
   -------------------------------------------------------------------------- */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; icon?: LucideIcon }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-line bg-subtle p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition duration-150",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-[13px]",
              active
                ? "bg-surface text-ink shadow-xs"
                : "text-muted hover:text-ink",
            )}
          >
            {Icon ? <Icon size={14} strokeWidth={2} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Switch
   -------------------------------------------------------------------------- */

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50",
        checked ? "bg-brand" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  );

  if (!label) return control;

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {description ? (
          <div className="mt-0.5 text-xs leading-relaxed text-muted">{description}</div>
        ) : null}
      </div>
      {control}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Search input
   -------------------------------------------------------------------------- */

export function SearchInput({
  value,
  onChange,
  placeholder = "ค้นหา…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        size={15}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-line bg-surface pr-8 pl-9 text-sm text-ink shadow-xs outline-none transition placeholder:text-faint focus:border-brand focus:ring-3 focus:ring-brand/16"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="ล้างการค้นหา"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-faint transition hover:text-ink"
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Copy to clipboard
   -------------------------------------------------------------------------- */

export function CopyButton({
  value,
  label = "คัดลอก",
  className,
  size = "sm",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }, [value]);

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={copy}
      icon={copied ? Check : Copy}
      className={cn(copied && "text-success-ink", className)}
    >
      {copied ? "คัดลอกแล้ว" : label}
    </Button>
  );
}

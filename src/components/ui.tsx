import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   PackEX UI — shared primitives
   Server-safe (no hooks / no browser APIs). Interactive primitives that need
   state live in `ui-client.tsx`.
   ========================================================================== */

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "rec";

const toneChip: Record<Tone, string> = {
  neutral: "bg-subtle text-ink-2 ring-line",
  brand: "bg-brand-soft text-brand-soft-ink ring-brand-border",
  success: "bg-success-soft text-success-ink ring-success/25",
  warning: "bg-warning-soft text-warning-ink ring-warning/30",
  danger: "bg-danger-soft text-danger-ink ring-danger/25",
  info: "bg-info-soft text-info-ink ring-info/25",
  rec: "bg-rec text-white ring-rec/40",
};

const toneDot: Record<Tone, string> = {
  neutral: "bg-faint",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  rec: "bg-rec",
};

/* --------------------------------------------------------------------------
   Badge
   -------------------------------------------------------------------------- */

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  icon: Icon,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        toneChip[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            tone === "rec" ? "bg-white" : toneDot[tone],
            tone === "rec" && "rec-pulse",
          )}
        />
      ) : null}
      {Icon ? <Icon size={12} strokeWidth={2.4} className="shrink-0" /> : null}
      {children}
    </span>
  );
}

/** Small status marker for tables — dot + label, no chrome. */
export function StatusDot({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-ink-2", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", toneDot[tone])} />
      {children}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Button
   -------------------------------------------------------------------------- */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "subtle"
  | "danger"
  | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-ink shadow-xs hover:bg-brand-hover focus-visible:outline-brand",
  secondary:
    "bg-surface text-ink ring-1 ring-inset ring-line shadow-xs hover:bg-subtle hover:ring-line-strong",
  outline:
    "bg-transparent text-ink ring-1 ring-inset ring-line-strong hover:bg-subtle",
  ghost: "bg-transparent text-ink-2 hover:bg-subtle hover:text-ink",
  subtle: "bg-subtle text-ink hover:bg-hover",
  danger: "bg-danger text-white shadow-xs hover:bg-danger-hover focus-visible:outline-danger",
  link: "bg-transparent text-brand underline-offset-4 hover:underline px-0",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-[13px]",
  md: "h-9.5 gap-2 rounded-md px-3.5 text-sm",
  lg: "h-11 gap-2 rounded-lg px-5 text-[15px]",
  icon: "h-9.5 w-9.5 rounded-md",
  "icon-sm": "h-8 w-8 rounded-md",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const iconSize = size === "sm" || size === "icon-sm" ? 15 : size === "lg" ? 18 : 16;
  return (
    <button
      className={cn(
        "press inline-flex shrink-0 items-center justify-center font-medium",
        "transition-[background-color,box-shadow,color,transform] duration-150",
        "disabled:pointer-events-none disabled:opacity-45",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon size={iconSize} strokeWidth={2} aria-hidden />
      ) : null}
      {children}
      {IconRight && !loading ? <IconRight size={iconSize} strokeWidth={2} aria-hidden /> : null}
    </button>
  );
}

/** Anchor styled as a button — same visual language, link semantics. */
export function ButtonLink({
  children,
  variant = "secondary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}) {
  const iconSize = size === "sm" || size === "icon-sm" ? 15 : size === "lg" ? 18 : 16;
  return (
    <a
      className={cn(
        "press inline-flex shrink-0 items-center justify-center font-medium",
        "transition-[background-color,box-shadow,color,transform] duration-150",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon size={iconSize} strokeWidth={2} aria-hidden /> : null}
      {children}
      {IconRight ? <IconRight size={iconSize} strokeWidth={2} aria-hidden /> : null}
    </a>
  );
}

/* --------------------------------------------------------------------------
   Card
   -------------------------------------------------------------------------- */

export function Card({
  children,
  className,
  as: Tag = "div",
  interactive = false,
  flush = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  interactive?: boolean;
  /** Remove default padding — for tables and media. */
  flush?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-line bg-surface shadow-sm",
        !flush && "p-5",
        interactive && "card-interactive",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon: Icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink-2">
            <Icon size={16} strokeWidth={2} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t border-line bg-subtle/50 px-5 py-3.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Page scaffolding
   -------------------------------------------------------------------------- */

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1.5 text-xs font-semibold tracking-[0.12em] text-brand uppercase">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-8", className)}>
      {title ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
            {description ? (
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("my-6 border-0 border-t border-line", className)} />;
}

/* --------------------------------------------------------------------------
   Metrics
   -------------------------------------------------------------------------- */

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  hint?: React.ReactNode;
  tone?: "default" | "danger" | "success" | "warning" | "brand";
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  className?: string;
}) {
  const valueTone = {
    default: "text-ink",
    danger: "text-danger",
    success: "text-success-ink",
    warning: "text-warning-ink",
    brand: "text-brand",
  }[tone];

  const iconTone = {
    default: "bg-subtle text-ink-2",
    danger: "bg-danger-soft text-danger-ink",
    success: "bg-success-soft text-success-ink",
    warning: "bg-warning-soft text-warning-ink",
    brand: "bg-brand-soft text-brand-soft-ink",
  }[tone];

  return (
    <div
      className={cn(
        "card-interactive rounded-xl border border-line bg-surface p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] font-medium text-muted">{label}</div>
        {Icon ? (
          <span
            className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconTone)}
          >
            <Icon size={16} strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "tabular mt-3 text-[1.875rem] leading-none font-semibold tracking-tight",
          valueTone,
        )}
      >
        {value}
      </div>
      {hint || trend ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
                trend.direction === "up" && "bg-success-soft text-success-ink",
                trend.direction === "down" && "bg-danger-soft text-danger-ink",
                trend.direction === "flat" && "bg-subtle text-ink-2",
              )}
            >
              {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}
              {trend.value}
            </span>
          ) : null}
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function Progress({
  value,
  max = 100,
  tone = "brand",
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: "brand" | "warning" | "danger" | "info";
  className?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const bar = {
    brand: "bg-brand",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
  }[tone];
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-subtle", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
   Empty / loading states
   -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-subtle/40 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-muted shadow-xs ring-1 ring-line">
          <Icon size={20} strokeWidth={1.8} />
        </div>
      ) : null}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;
}

export function Spinner({ className, size = 18 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn("animate-spin text-muted", className)} aria-hidden />;
}

/* --------------------------------------------------------------------------
   Callout
   -------------------------------------------------------------------------- */

export function Callout({
  tone = "info",
  title,
  children,
  icon: Icon,
  className,
  action,
}: {
  tone?: "info" | "success" | "warning" | "danger" | "brand";
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  action?: React.ReactNode;
}) {
  const tones = {
    info: "border-info/25 bg-info-soft text-info-ink",
    success: "border-success/25 bg-success-soft text-success-ink",
    warning: "border-warning/30 bg-warning-soft text-warning-ink",
    danger: "border-danger/25 bg-danger-soft text-danger-ink",
    brand: "border-brand-border bg-brand-soft text-brand-soft-ink",
  }[tone];

  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", tones, className)}>
      {Icon ? <Icon size={18} strokeWidth={2} className="mt-0.5 shrink-0" /> : null}
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-1", "opacity-90")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Tables
   -------------------------------------------------------------------------- */

export function TableCard({
  children,
  className,
  header,
  footer,
  minWidthClassName = "min-w-[720px]",
}: {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  minWidthClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-surface shadow-sm",
        className,
      )}
    >
      {header}
      <div className="w-full overflow-x-auto">
        <div className={cn("w-full", minWidthClassName)}>{children}</div>
      </div>
      {footer}
    </div>
  );
}

export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <table className={cn("w-full text-left text-sm", className)}>{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-line bg-subtle/60">
      <tr className="text-xs font-medium tracking-wide text-muted uppercase">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 font-medium whitespace-nowrap",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tbody className={cn("divide-y divide-line", className)}>{children}</tbody>;
}

export function Tr({
  children,
  className,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  /** Makes the whole row activatable by pointer and keyboard. */
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <tr
      className={cn(
        "transition-colors duration-100 hover:bg-subtle/60",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      role={onClick ? "link" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
  align = "left",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-3 align-middle text-ink-2",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

/* --------------------------------------------------------------------------
   Forms
   -------------------------------------------------------------------------- */

export const inputClassName =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink shadow-xs outline-none transition duration-150 placeholder:text-faint focus:border-brand focus:ring-3 focus:ring-brand/16 disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-60";

export const selectClassName = cn(inputClassName, "cursor-pointer appearance-none bg-none pr-9");

export function Field({
  label,
  children,
  hint,
  error,
  required,
  htmlFor,
  className,
}: {
  label?: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-ink"
        >
          {label}
          {required ? <span className="text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger-ink">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClassName, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClassName, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(selectClassName, className)} {...props}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 transition hover:bg-subtle/60 has-checked:border-brand-border has-checked:bg-brand-soft/60",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
        {...props}
      />
      <span className="min-w-0 text-sm">
        {label ? <span className="block font-medium text-ink">{label}</span> : null}
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/* --------------------------------------------------------------------------
   Misc
   -------------------------------------------------------------------------- */

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-soft-ink ring-1 ring-brand-border select-none",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

/** Definition list used across detail pages. */
export function KeyValue({
  items,
  className,
  columns = 2,
}: {
  items: { label: React.ReactNode; value: React.ReactNode }[];
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-medium text-muted">{item.label}</dt>
          <dd className="mt-1 text-sm break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Toolbar row above tables — filters on the left, actions on the right. */
export function Toolbar({
  children,
  actions,
  className,
}: {
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

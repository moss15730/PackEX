import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "rec";
  className?: string;
}) {
  const tones = {
    neutral: "bg-[var(--surface-2)] text-[var(--ink)] ring-1 ring-inset ring-[var(--border)]",
    success:
      "bg-emerald-500/12 text-emerald-800 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300",
    warning:
      "bg-amber-500/12 text-amber-900 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300",
    danger: "bg-rose-500/12 text-rose-800 ring-1 ring-inset ring-rose-500/25 dark:text-rose-300",
    info: "bg-sky-500/12 text-sky-800 ring-1 ring-inset ring-sky-500/25 dark:text-sky-300",
    rec: "bg-[var(--rec)] text-white shadow-sm shadow-rose-600/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
}) {
  const variants = {
    primary:
      "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm shadow-[color-mix(in_srgb,var(--accent)_35%,transparent)] hover:brightness-110 active:brightness-95",
    secondary:
      "bg-[var(--surface-2)] text-[var(--ink)] ring-1 ring-inset ring-[var(--border)] hover:bg-[var(--surface-3)]",
    ghost: "bg-transparent text-[var(--ink)] hover:bg-[var(--surface-2)]",
    danger: "bg-rose-600 text-white shadow-sm shadow-rose-600/25 hover:bg-rose-500",
    outline:
      "border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] text-[var(--ink)] backdrop-blur-sm hover:bg-[var(--surface-2)]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-semibold transition duration-150 disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div> : null}
    </div>
  );
}

export function TableScroll({
  children,
  className,
  minWidthClassName = "min-w-[640px]",
}: {
  children: React.ReactNode;
  className?: string;
  minWidthClassName?: string;
}) {
  return (
    <Card className={cn("overflow-x-auto p-0", className)}>
      <div className={cn("w-full", minWidthClassName)}>{children}</div>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_65%,transparent)] px-6 py-14 text-center">
      <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--ink)]">
        {title}
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-2.5 font-[family-name:var(--font-display)] text-[1.75rem] font-semibold leading-none tracking-tight",
          tone === "danger" && "text-rose-600 dark:text-rose-400",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          (!tone || tone === "default") && "text-[var(--ink)]",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs text-[var(--muted)]">{hint}</div> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">{label}</label>
      {children}
    </div>
  );
}

export const inputClassName =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]";

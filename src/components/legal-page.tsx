import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PackExWordmark } from "@/components/brand";

/** Shared chrome for public legal documents (privacy, terms). */
export function LegalPage({
  title,
  subtitle,
  note,
  children,
}: {
  title: string;
  subtitle?: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="aurora min-h-[100dvh]">
      <header className="glass sticky top-0 z-30 border-b border-line/60">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex">
            <PackExWordmark size="sm" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
          >
            <ArrowLeft size={14} />
            กลับหน้าแรก
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-3 text-sm text-muted">{subtitle}</p> : null}

        <div className="mt-8 space-y-4">{children}</div>

        {note ? <p className="mt-8 text-xs text-faint">{note}</p> : null}
      </main>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-7">
      <h2 className="text-base font-semibold text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

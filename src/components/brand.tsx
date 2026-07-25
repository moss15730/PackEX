import { cn } from "@/lib/utils";

/**
 * PackEX mark — a packing carton seen from above with a recording lens at its
 * centre. Drawn with theme tokens so it inverts cleanly with the palette and
 * needs no gradient ids (safe to render on the server, any number of times).
 */
export function PackExMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="8.5"
        stroke="white"
        strokeOpacity="0.18"
      />
      {/* carton — lid, left face, right face */}
      <path d="M16 6L24.5 10.75L16 15.5L7.5 10.75L16 6Z" fill="white" fillOpacity="0.95" />
      <path d="M7.5 10.75L16 15.5V25L7.5 20.25V10.75Z" fill="white" fillOpacity="0.5" />
      <path d="M24.5 10.75L16 15.5V25L24.5 20.25V10.75Z" fill="white" fillOpacity="0.72" />
      {/* recording lens */}
      <circle cx="16" cy="18.4" r="3.4" fill="var(--brand)" />
      <circle cx="16" cy="18.4" r="1.6" fill="white" />
    </svg>
  );
}

export function PackExWordmark({
  className,
  size = "md",
  subtitle = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  subtitle?: boolean;
}) {
  const markSize = size === "sm" ? 26 : size === "lg" ? 40 : 32;
  const textSize = size === "sm" ? "text-[15px]" : size === "lg" ? "text-2xl" : "text-[17px]";

  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      role="img"
      aria-label="PackEX"
    >
      <PackExMark size={markSize} />
      <span className="leading-none">
        <span className={cn("block font-semibold tracking-[-0.02em] text-ink", textSize)}>
          Pack<span className="text-brand">EX</span>
        </span>
        {subtitle ? (
          <span className="mt-1 block text-[9px] font-medium tracking-[0.18em] text-muted uppercase">
            Packing Video Systems
          </span>
        ) : null}
      </span>
    </span>
  );
}

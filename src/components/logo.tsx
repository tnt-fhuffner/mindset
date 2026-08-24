import { cn } from "@/lib/utils";

export function Logo({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <circle cx="16" cy="11" r="3.1" className="fill-primary-foreground" />
        <circle cx="8.5" cy="21" r="2.4" className="fill-primary-foreground/90" />
        <circle cx="23.5" cy="21" r="2.4" className="fill-primary-foreground/90" />
        <path d="M14 13.2 10 19.1M18 13.2l4 5.9" className="stroke-primary-foreground/80" strokeWidth="1.6" fill="none" />
      </svg>
      {!markOnly && <span>MindSet</span>}
    </span>
  );
}

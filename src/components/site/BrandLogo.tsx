import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        className="size-5"
        aria-hidden
      >
        {/* DNA helix */}
        <path d="M8 3c0 6 8 15 8 18" opacity="0.55" />
        <path d="M16 3c0 6-8 15-8 18" opacity="0.55" />
        <path d="M8 7h8M7.5 12h9M8 17h8" />
        <circle cx="8" cy="3" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="16" cy="21" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

export function BrandLogo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-extrabold tracking-tight">
            Genova
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            Life-sciences stack · تیم داخلی
          </span>
        </span>
      )}
    </span>
  );
}

import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";

export function BrandMark({ className }: { className?: string }) {
  const { settings } = useSettings();
  const isDark = settings.theme === "dark";

  return (
    <div
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm",
        className,
      )}
    >
      <img
        src={isDark ? "/logo-dark.png" : "/logo-light.png"}
        alt="Genova logo"
        className="size-full object-contain"
        draggable={false}
      />
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

import { useMode } from "@/hooks/useMode";
import { Button } from "@/components/ui/button";
import { Globe, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModeSwitcher() {
  const { mode, setMode } = useMode();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 p-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMode("global")}
        className={cn(
          "h-7 gap-1.5 px-2.5 text-xs font-medium transition-all",
          mode === "global"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Globe className="size-3" />
        <span className="hidden sm:inline">جهانی</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMode("iran")}
        className={cn(
          "h-7 gap-1.5 px-2.5 text-xs font-medium transition-all",
          mode === "iran"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Flag className="size-3" />
        <span className="hidden sm:inline">ایران</span>
      </Button>
    </div>
  );
}

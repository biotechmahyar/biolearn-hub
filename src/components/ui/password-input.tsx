import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordInputProps extends React.ComponentProps<typeof Input> {
  /** Keep the text left-to-right (for email-style passwords) — moves the eye to the right edge. */
  ltr?: boolean;
}

export function PasswordInput({ className, ltr, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn(ltr ? "pr-10" : "pl-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        title={visible ? "پنهان کردن رمز" : "نمایش رمز"}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground",
          ltr ? "right-2.5" : "left-2.5",
        )}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

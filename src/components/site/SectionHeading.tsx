import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  kicker,
  title,
  description,
  actionLabel,
  actionTo,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {kicker && (
          <p className="mb-2 text-sm font-semibold text-primary">{kicker}</p>
        )}
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-balance">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        )}
      </div>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          {actionLabel}
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        </Link>
      )}
    </div>
  );
}

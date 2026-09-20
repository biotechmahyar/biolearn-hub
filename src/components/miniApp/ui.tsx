/**
 * Shared Mini App UI atoms
 * ─────────────────────────────────────────────────────────────────────────────
 * Small, mobile-first building blocks used by every section of `/mini`.
 * They are platform-agnostic: the same components render in Telegram, Bale and
 * the browser fallback, and they stay inside the existing Genova visual
 * language (Tailwind tokens + the teal/emerald brand accent).
 *
 * Nothing here talks to the backend — each screen owns its own queries so the
 * Mini App only subscribes to what the student is actually looking at.
 */
import type { ReactNode } from "react";
import { ChevronLeft, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Navigation contract ─────────────────────────────────────────────────────

/** Secondary screens pushed on top of the five main tabs. */
export type MiniScreen =
  | { name: "course"; slug: string }
  | { name: "workshop"; slug: string }
  | { name: "product"; slug: string }
  | { name: "products" }
  | { name: "orders" }
  | { name: "exams" }
  | { name: "exam"; slug: string }
  | { name: "quiz" }
  | { name: "notifications" }
  | { name: "support" }
  | { name: "ticket"; id: string }
  | { name: "questions" }
  | { name: "sessions" }
  | { name: "groups" }
  | { name: "admin" };

/** The five main tabs of the Mini App. */
export type MiniTab = "home" | "courses" | "learning" | "workshops" | "profile";

/** A tab switch, or a secondary screen to push on top of the current tab. */
export type MiniTarget = MiniScreen | { name: MiniTab };

/**
 * Navigate: switching to a tab clears the pushed stack, pushing a screen keeps
 * the current tab underneath so back returns to it.
 */
export type MiniNav = (target: MiniTarget) => void;

/** Every screen component receives the pusher plus an optional param. */
export interface MiniScreenProps {
  nav: MiniNav;
  /** The authenticated Genova user (from api.users.currentUser via useAuth). */
  user: MiniUser;
}

/** Minimal shape of the signed-in user the Mini App relies on. */
export interface MiniUser {
  _id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

// ── Atoms ───────────────────────────────────────────────────────────────────

export function MiniCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const interactive = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick?.();
            }
          : undefined
      }
      className={cn(
        "rounded-2xl border bg-card p-3 shadow-sm",
        interactive && "cursor-pointer transition-colors active:bg-muted/60",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-0.5">
      <h3 className="text-sm font-bold">{title}</h3>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs font-medium text-teal-600 dark:text-teal-400"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function MiniLoading({ label = "در حال بارگذاری…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Loader2 className="size-6 animate-spin text-teal-500" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function MiniEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-2xl border border-dashed px-4 py-8 text-center">
      <Icon className="mx-auto mb-2 size-8 text-muted-foreground/40" />
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 rounded-xl bg-teal-600 px-4 py-2 text-xs font-medium text-white"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function MiniError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-5 text-center">
      <p className="text-sm font-medium text-destructive">خطا در دریافت اطلاعات</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs"
        >
          <RefreshCw className="size-3" />
          تلاش دوباره
        </button>
      ) : null}
    </div>
  );
}

/** Small status chip. */
export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "info" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    warn: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    info: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        tones[tone] ?? tones.neutral,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-gradient-to-l from-teal-500 to-emerald-500 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function StatTile({
  value,
  label,
  tone = "teal",
}: {
  value: string | number;
  label: string;
  tone?: "teal" | "sky" | "amber" | "violet";
}) {
  const tones: Record<string, string> = {
    teal: "text-teal-600 dark:text-teal-400",
    sky: "text-sky-600 dark:text-sky-400",
    amber: "text-amber-600 dark:text-amber-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <MiniCard className="p-3 text-center">
      <p className={cn("text-xl font-black", tones[tone])}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </MiniCard>
  );
}

/** Full-width touch-friendly action button. */
export function MiniButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-teal-600 text-white hover:bg-teal-700",
    outline: "border bg-transparent hover:bg-muted/60",
    ghost: "bg-muted/60 hover:bg-muted",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Header for a pushed sub-screen: native-feeling back arrow + title. */
export function ScreenHeader({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="بازگشت"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card active:bg-muted"
      >
        <ChevronLeft className="size-4 rotate-180" />
      </button>
      <h2 className="min-w-0 flex-1 truncate text-sm font-bold">{title}</h2>
      {trailing}
    </div>
  );
}

/** A single label/value row used across profile, orders and details. */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-left font-medium">{value}</span>
    </div>
  );
}

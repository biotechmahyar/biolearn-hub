import { Award, House, Map, Play, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";

export type GenotabScreen = "home" | "path" | "leaderboard" | "badges" | "review";

/** Soft confetti used behind the green hero / leaderboard surfaces. */
export function Confetti({ className }: { className?: string }) {
  const dots = [
    { x: 8, y: 18, c: "#A7F3D0", r: 18, s: 6 },
    { x: 20, y: 64, c: "#FDE68A", r: 45, s: 5 },
    { x: 31, y: 12, c: "#FFFFFF", r: 10, s: 4 },
    { x: 44, y: 78, c: "#BAE6FD", r: 70, s: 5 },
    { x: 57, y: 22, c: "#FDE68A", r: 30, s: 4 },
    { x: 68, y: 66, c: "#FFFFFF", r: 55, s: 6 },
    { x: 79, y: 16, c: "#A7F3D0", r: 25, s: 5 },
    { x: 90, y: 52, c: "#FBCFE8", r: 60, s: 4 },
    { x: 12, y: 86, c: "#FFFFFF", r: 35, s: 3 },
    { x: 62, y: 90, c: "#A7F3D0", r: 15, s: 4 },
  ];
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {dots.map((dot, index) => (
        <span
          key={index}
          className="absolute block rounded-[2px] opacity-70"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.s,
            height: dot.s * 1.6,
            background: dot.c,
            transform: `rotate(${dot.r}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/** Yellow lightning + number, used for every XP figure. */
export function XpAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-extrabold tabular-nums", className)}>
      <Zap className="size-3.5 fill-amber-400 text-amber-400" />
      {faNum(value)} XP
    </span>
  );
}

export function Progress({ value, className, tone = "green" }: { value: number; className?: string; tone?: "green" | "white" | "amber" }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full", tone === "white" ? "bg-white/25" : "bg-slate-200/70", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          tone === "white" ? "bg-white" : tone === "amber" ? "bg-amber-400" : "bg-[#12B76A]",
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

const NAV_ITEMS: { id: GenotabScreen | "resume"; label: string; icon: typeof House }[] = [
  { id: "home", label: "خانه", icon: House },
  { id: "path", label: "مسیر", icon: Map },
  { id: "resume", label: "ادامه", icon: Play },
  { id: "leaderboard", label: "جدول", icon: Trophy },
  { id: "badges", label: "نشان‌ها", icon: Award },
];

/** Floating dark pill nav, matching the reference app shell. */
export function BottomNav({
  active,
  onNavigate,
  onResume,
  resumeDisabled,
}: {
  active: GenotabScreen;
  onNavigate: (screen: GenotabScreen) => void;
  onResume: () => void;
  resumeDisabled?: boolean;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto flex w-[min(94%,430px)] items-center justify-between rounded-[26px] bg-[#0B1512]/95 px-3 py-1.5 shadow-[0_18px_40px_-16px_rgba(3,20,14,0.7)] backdrop-blur-xl">
      {NAV_ITEMS.map((item) => {
        if (item.id === "resume") {
          return (
            <button
              key={item.id}
              type="button"
              onClick={onResume}
              disabled={resumeDisabled}
              title={item.label}
              className="-mt-6 flex size-12 cursor-pointer items-center justify-center rounded-full bg-[#12B76A] text-white shadow-[0_10px_24px_-8px_rgba(18,183,106,0.9)] ring-4 ring-[#F2F7F3] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <Play className="size-5 fill-white" />
            </button>
          );
        }
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id as GenotabScreen)}
            className={cn(
              "flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[9px] font-bold transition-colors",
              isActive ? "text-white" : "text-white/45 hover:text-white/75",
            )}
          >
            <item.icon className={cn("size-5", isActive && "text-[#34D399]")} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

/** Colored topic tile (Variables / Loops / Functions rhythm of the reference). */
export function TopicTile({
  title,
  caption,
  icon,
  tint,
  locked,
  onClick,
}: {
  title: string;
  caption: string;
  icon: string;
  tint: "emerald" | "sky" | "violet" | "amber" | "rose" | "teal";
  locked?: boolean;
  onClick: () => void;
}) {
  const tints: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    teal: "bg-teal-50 text-teal-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer flex-col items-start gap-1.5 rounded-2xl border border-slate-100 bg-white p-3 text-right transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-16px_rgba(6,60,40,0.5)]",
        locked && "opacity-60",
      )}
    >
      <span className={cn("flex size-9 items-center justify-center rounded-xl text-base", tints[tint])}>{icon}</span>
      <span className="text-[11.5px] font-extrabold leading-5 text-slate-800">{title}</span>
      <span className="text-[9.5px] font-semibold text-slate-400">{caption}</span>
    </button>
  );
}

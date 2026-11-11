import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Award, Check, ChevronLeft, Loader2, Lock, Share2, Sparkles, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";
import { Confetti, Progress, XpAmount } from "./ui";

/** Deterministic avatar colour so the same learner always looks the same. */
function avatarTint(name: string) {
  const palette = ["bg-emerald-100 text-emerald-800", "bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-800", "bg-teal-100 text-teal-800"];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 3)) % 997;
  return palette[hash % palette.length];
}

export function Avatar({ name, size = "md", ring }: { name: string; size?: "sm" | "md" | "lg"; ring?: string }) {
  const initials = name.trim().slice(0, 1) || "؟";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-extrabold",
        avatarTint(name),
        size === "sm" ? "size-8 text-[11px]" : size === "lg" ? "size-16 text-lg" : "size-10 text-sm",
        ring,
      )}
    >
      {initials}
    </span>
  );
}

/** Weekly XP bars + honest percentile line (reference: “Learning Progress”). */
export function ProgressChart({
  weekly,
  dailyGoal,
  percentile,
  weeklyTotal,
  compact,
}: {
  weekly: { label: string; xp: number }[];
  dailyGoal: number;
  percentile: number | null;
  weeklyTotal: number;
  compact?: boolean;
}) {
  const max = Math.max(dailyGoal, ...weekly.map((day) => day.xp), 10);
  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_12px_30px_-24px_rgba(6,60,40,0.6)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-extrabold text-slate-900">پیشرفت یادگیری</h3>
          <p className="text-[9.5px] font-semibold text-slate-400">گزارش هفت روز گذشته · {weeklyTotal} XP</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-700">این هفته</span>
      </div>

      <div className={cn("mt-3 flex items-end justify-between gap-1.5", compact ? "h-20" : "h-28")}>
        {weekly.map((day, index) => {
          const height = Math.max(6, Math.round((day.xp / max) * 100));
          const isToday = index === weekly.length - 1;
          return (
            <div key={`${day.label}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className={cn("text-[8px] font-bold tabular-nums", day.xp > 0 ? "text-slate-500" : "text-slate-300")}>
                {day.xp > 0 ? faNum(day.xp) : "·"}
              </span>
              <div
                className={cn(
                  "w-full max-w-8 rounded-t-[6px] rounded-b-[3px] transition-all",
                  isToday ? "bg-[#12B76A]" : day.xp > 0 ? "bg-emerald-200" : "bg-slate-100",
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between border-t border-dashed border-slate-100 pt-1">
        {weekly.map((day, index) => (
          <span key={`${day.label}-label-${index}`} className="flex-1 text-center text-[8.5px] font-bold text-slate-400">
            {day.label}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold text-slate-400">هدف روزانه: {faNum(dailyGoal)} XP</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-700">
          <Check className="size-3" />
          {percentile === null
            ? "اولین مسیر هفتگی‌ات"
            : percentile === 0
              ? "با اولین درس شروع کن و جلو بزن"
              : `از ${faNum(percentile)}٪ یادگیرندگان جلوتری`}
        </span>
      </div>
    </section>
  );
}

type Row = { userId: string; name: string; xp: number };

function RankRow({ row, rank, me }: { row: Row; rank: number; me?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-2xl px-2 py-2", me ? "bg-emerald-50/80 ring-1 ring-emerald-200" : "odd:bg-slate-50/60")}>
      <span className="w-4 text-center text-[10px] font-extrabold tabular-nums text-slate-400">{faNum(rank)}</span>
      <Avatar name={row.name} size="sm" />
      <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-slate-700">
        {row.name}
        {me ? <span className="mr-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[8px] text-white">شما</span> : null}
      </span>
      <XpAmount value={row.xp} className="text-[10px] text-slate-600" />
    </div>
  );
}

/** Full leaderboard screen: green header, podium, list (reference: Leaderboard). */
export function LeaderboardScreen({ userName }: { userName: string | null }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const board = useQuery(api.genotabLearning.leaderboard, { period });
  const items = board?.items ?? [];
  const podium = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <div className="relative">
      <div className="relative -mx-4 -mt-3 overflow-hidden rounded-b-[34px] bg-gradient-to-b from-[#18B865] to-[#0E8F52] pb-16 pt-3">
        <Confetti />
        <div className="relative text-center text-white">
          <h2 className="text-[17px] font-black">جدول امتیازات</h2>
          <p className="text-[10px] font-semibold text-white/80">پیشرفتت را با بقیهٔ یادگیرندگان مقایسه کن</p>
          <div className="mx-auto mt-2 flex w-max rounded-full bg-black/15 p-0.5 text-[9.5px] font-extrabold">
            {(["week", "month"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={cn("cursor-pointer rounded-full px-3 py-1 transition-colors", period === key ? "bg-white text-emerald-700" : "text-white/75")}
              >
                {key === "week" ? "این هفته" : "این ماه"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-3 flex max-w-md items-end justify-center gap-2 px-4">
          {[podium[1], podium[0], podium[2]].map((row, slot) => {
            if (!row) return <div key={`empty-${slot}`} className="w-20" />;
            const rank = slot === 1 ? 1 : slot === 0 ? 2 : 3;
            const isFirst = rank === 1;
            return (
              <div key={row.userId} className={cn("flex flex-col items-center", isFirst ? "-mt-4" : "mt-2")}>
                {isFirst ? <span className="mb-0.5 text-sm">👑</span> : null}
                <div className={cn("rounded-full p-1", isFirst ? "bg-amber-300/90" : rank === 2 ? "bg-slate-200/90" : "bg-orange-200/90")}>
                  <Avatar name={row.name} size={isFirst ? "lg" : "md"} ring="ring-2 ring-white" />
                </div>
                <p className="mt-1 max-w-20 truncate text-[10px] font-extrabold text-white">{row.name}</p>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/85">
                  <Zap className="size-2.5 fill-amber-300 text-amber-300" />
                  {faNum(row.xp)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="-mt-10 px-3">
        <div className="rounded-[26px] bg-white p-3 shadow-[0_18px_40px_-28px_rgba(6,60,40,0.55)]">
          <div className="mb-1.5 flex items-center gap-1.5 px-1">
            <Trophy className="size-3.5 text-amber-500" />
            <p className="text-[10px] font-extrabold text-slate-500">رتبه‌بندی بر اساس XP واقعی</p>
          </div>
          {board === undefined ? (
            <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-emerald-600" /></div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-[10.5px] text-slate-400">هنوز امتیازی در این بازه ثبت نشده است. اولین نفر باش!</p>
          ) : (
            <div className="space-y-1">
              {rest.map((row, index) => (
                <RankRow key={row.userId} row={row} rank={index + 4} me={Boolean(userName) && row.name === userName} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact leaderboard card for the home screen. */
export function LeaderboardPreview({ onOpen }: { onOpen: () => void }) {
  const board = useQuery(api.genotabLearning.leaderboard, { period: "week" });
  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_12px_30px_-24px_rgba(6,60,40,0.6)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-extrabold text-slate-900">جدول امتیازات</h3>
          <p className="text-[9.5px] font-semibold text-slate-400">ببین در میان یادگیرندگان کجایی</p>
        </div>
        <button type="button" onClick={onOpen} className="flex cursor-pointer items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-700">
          همه
          <ChevronLeft className="size-3" />
        </button>
      </div>
      {board === undefined ? (
        <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin text-emerald-600" /></div>
      ) : board.items.length === 0 ? (
        <p className="py-3 text-center text-[10px] text-slate-400">هنوز رتبه‌ای ثبت نشده — با اولین درس شروع کن.</p>
      ) : (
        <div className="mt-2 space-y-1">
          {board.items.slice(0, 4).map((row, index) => (
            <RankRow key={row.userId} row={row} rank={index + 1} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Badge grid (reference: reward shields with claim action). */
export function BadgesScreen({
  achievements,
}: {
  achievements: { id: string; title: string; desc: string; icon: string; earned: boolean }[];
}) {
  const earned = achievements.filter((item) => item.earned).length;
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-l from-[#0E8F52] to-[#18B865] p-4 text-white">
        <Confetti />
        <div className="relative">
          <p className="text-[15px] font-black">نشان‌های ژن‌آموز</p>
          <p className="mt-0.5 text-[10px] font-semibold text-white/80">
            {faNum(earned)} از {faNum(achievements.length)} نشان بهدست آمده
          </p>
          <Progress value={(earned / Math.max(1, achievements.length)) * 100} tone="white" className="mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {achievements.map((item) => (
          <div
            key={item.id}
            className={cn(
              "relative overflow-hidden rounded-[22px] border p-3 text-center",
              item.earned ? "border-amber-200 bg-gradient-to-b from-amber-50 to-white" : "border-slate-100 bg-white",
            )}
          >
            <div
              className={cn(
                "mx-auto flex size-14 items-center justify-center rounded-[18px] text-2xl shadow-inner",
                item.earned ? "bg-gradient-to-b from-amber-200 to-amber-100" : "bg-slate-100 grayscale",
              )}
            >
              {item.earned ? item.icon : <Lock className="size-5 text-slate-400" />}
            </div>
            <p className="mt-2 text-[11.5px] font-extrabold text-slate-800">{item.title}</p>
            <p className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-slate-400">{item.desc}</p>
            <span
              className={cn(
                "mt-2 flex w-full items-center justify-center gap-1 rounded-full py-1.5 text-[9.5px] font-extrabold",
                item.earned ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400",
              )}
            >
              {item.earned ? (
                <>
                  <Share2 className="size-3" /> دریافت شد
                </>
              ) : (
                "در انتظار"
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Review queue: every missed question with the correct answer and explanation. */
export function ReviewPanel() {
  const queue = useQuery(api.genotabLearning.reviewQueue);
  const resolve = useMutation(api.genotabLearning.resolveMistake);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (queue === undefined) {
    return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-emerald-600" /></div>;
  }
  if (queue.total === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-emerald-200 bg-white p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">🎉</span>
        <p className="mt-2 text-[12px] font-extrabold text-slate-700">صف مرور خالی است</p>
        <p className="mt-1 text-[10px] leading-5 text-slate-400">هر سؤالی که غلط پاسخ دهی، اینجا همراه پاسخ درست و توضیح علمی می‌آید.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-slate-400">{faNum(queue.total)} سؤال در صف مرور</p>
      {queue.items.map((item) => (
        <div key={item.id} className="rounded-[22px] border border-slate-100 bg-white p-3.5 shadow-[0_10px_24px_-22px_rgba(6,60,40,0.6)]">
          <p className="text-[9.5px] font-extrabold text-emerald-700">{item.lessonTitle}</p>
          <p className="mt-1 text-[12px] font-extrabold leading-6 text-slate-800">{item.prompt}</p>
          <p className="mt-1.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[10.5px] leading-5 text-emerald-900">
            <b>پاسخ درست:</b> {item.correctAnswer}
          </p>
          <p className="mt-1.5 text-[10.5px] leading-6 text-slate-500">{item.explanation}</p>
          <button
            type="button"
            disabled={pendingId === item.id}
            onClick={async () => {
              setPendingId(item.id);
              try {
                await resolve({ id: item.id as never });
              } finally {
                setPendingId(null);
              }
            }}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="size-3" /> مرور شد
          </button>
        </div>
      ))}
    </div>
  );
}

/** Small row of earned badges for the home screen. */
export function BadgeStrip({ achievements, onOpen }: { achievements: { id: string; title: string; icon: string; earned: boolean }[]; onOpen: () => void }) {
  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold text-slate-900">
          <Award className="size-4 text-violet-500" /> نشان‌ها
        </h3>
        <button type="button" onClick={onOpen} className="flex cursor-pointer items-center gap-0.5 rounded-full bg-violet-50 px-2 py-1 text-[9px] font-extrabold text-violet-700">
          همه
          <ChevronLeft className="size-3" />
        </button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {achievements.slice(0, 6).map((item) => (
          <div key={item.id} className="flex w-14 shrink-0 flex-col items-center gap-1">
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl text-xl",
                item.earned ? "bg-gradient-to-b from-amber-100 to-amber-50 ring-1 ring-amber-200" : "bg-slate-100 opacity-60 grayscale",
              )}
            >
              {item.earned ? item.icon : <Lock className="size-4 text-slate-400" />}
            </span>
            <span className="w-full truncate text-center text-[8px] font-bold text-slate-500">{item.title}</span>
          </div>
        ))}
      </div>
      <p className="mt-1 flex items-center gap-1 text-[9px] text-slate-400">
        <Sparkles className="size-3" /> نشان‌ها با کامل‌کردن درس‌ها و آزمون‌ها باز می‌شوند
      </p>
    </section>
  );
}

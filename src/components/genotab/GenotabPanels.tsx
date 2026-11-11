import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Award, CalendarDays, Check, Loader2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";

/** مرور اشتباهات — هر مورد با پاسخ درست و توضیح علمی. */
export function ReviewPanel() {
  const queue = useQuery(api.genotabLearning.reviewQueue);
  const resolve = useMutation(api.genotabLearning.resolveMistake);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (queue === undefined) {
    return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-emerald-600" /></div>;
  }
  if (queue.total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-900/15 bg-white/70 p-6 text-center">
        <Check className="mx-auto size-6 text-emerald-500" />
        <p className="mt-2 text-[12px] font-bold text-slate-600">هیچ پاسخ غلطی در صف مرور نیست.</p>
        <p className="mt-1 text-[10.5px] text-slate-400">هر سؤالی که غلط پاسخ دهید، اینجا با توضیح علمی ظاهر می‌شود.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[10.5px] font-bold text-slate-400">{faNum(queue.total)} سؤال در صف مرور</p>
      {queue.items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-bold text-emerald-700">{item.lessonTitle}</p>
          <p className="mt-1 text-[12px] font-extrabold leading-6 text-slate-800">{item.prompt}</p>
          <p className="mt-1.5 text-[11px] leading-6 text-slate-600">
            <b className="text-emerald-700">پاسخ درست:</b> {item.correctAnswer}
          </p>
          <p className="mt-0.5 text-[10.5px] leading-6 text-slate-500">{item.explanation}</p>
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
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full border border-emerald-200 px-3 py-1.5 text-[10.5px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <Check className="size-3" /> مرور شد
          </button>
        </div>
      ))}
    </div>
  );
}

/** جدول امتیازات هفتگی / ماهانه. */
export function LeaderboardPanel() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const board = useQuery(api.genotabLearning.leaderboard, { period });

  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-800">
          <Trophy className="size-4 text-amber-500" /> جدول امتیازات
        </p>
        <div className="flex rounded-full bg-slate-100 p-0.5">
          {(["week", "month"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors",
                period === key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500",
              )}
            >
              {key === "week" ? "این هفته" : "این ماه"}
            </button>
          ))}
        </div>
      </div>
      {board === undefined ? (
        <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin text-emerald-600" /></div>
      ) : board.items.length === 0 ? (
        <p className="py-3 text-center text-[10.5px] text-slate-400">هنوز امتیازی در این بازه ثبت نشده است.</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {board.items.map((row, index) => (
            <li key={row.userId} className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 odd:bg-slate-50/70">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-extrabold",
                  index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-200 text-slate-600" : index === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-400",
                )}
              >
                {faNum(index + 1)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-slate-700">{row.name}</span>
              <span className="text-[10.5px] font-extrabold text-emerald-700">{faNum(row.xp)} XP</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 flex items-center gap-1 text-[9.5px] text-slate-400">
        <CalendarDays className="size-3" /> بر اساس XP واقعی ثبت‌شده در بازهٔ انتخابی
      </p>
    </div>
  );
}

/** دستاوردهای یادگیرنده (بر اساس وضعیت واقعی، نه شمارندهٔ ساختگی). */
export function AchievementsPanel({
  achievements,
}: {
  achievements: { id: string; title: string; desc: string; icon: string; earned: boolean }[];
}) {
  const earned = achievements.filter((item) => item.earned).length;
  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-800">
          <Award className="size-4 text-violet-500" /> نشان‌ها
        </p>
        <span className="text-[10px] font-bold text-slate-400">
          {faNum(earned)} از {faNum(achievements.length)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {achievements.map((item) => (
          <div
            key={item.id}
            title={`${item.title} — ${item.desc}`}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center",
              item.earned ? "border-amber-200 bg-amber-50/60" : "border-slate-100 bg-slate-50 opacity-55",
            )}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="line-clamp-1 text-[8.5px] font-bold text-slate-600">{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

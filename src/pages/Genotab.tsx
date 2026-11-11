import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Flame,
  GraduationCap,
  Heart,
  Loader2,
  Lock,
  Play,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";
import { LessonPlayer } from "@/components/genotab/LessonPlayer";
import { ExamPlayer } from "@/components/genotab/ExamPlayer";
import { AchievementsPanel, LeaderboardPanel, ReviewPanel } from "@/components/genotab/GenotabPanels";

type Route =
  | { kind: "home" }
  | { kind: "lesson"; id: string }
  | { kind: "exam"; examKind: "chapter" | "course"; chapterId?: string };

const LEVEL_LABELS: Record<string, string> = {
  beginner: "مقدماتی",
  intermediate: "میانی",
  advanced: "پیشرفته",
  mixed: "مقدماتی تا پیشرفته",
};

export default function GenotabPage() {
  const [route, setRoute] = useState<Route>({ kind: "home" });
  const home = useQuery(api.genotabLearning.home);
  const path = useQuery(api.genotabLearning.coursePath, { courseSlug: "cell-biology-intro" });

  const nextLessonId = home?.course.nextLessonId ?? null;

  if (route.kind === "lesson") {
    return (
      <LessonPlayer
        key={route.id}
        lessonId={route.id}
        onExit={() => setRoute({ kind: "home" })}
        onOpenLesson={(id) => setRoute({ kind: "lesson", id })}
      />
    );
  }
  if (route.kind === "exam") {
    return <ExamPlayer kind={route.examKind} chapterId={route.chapterId} onExit={() => setRoute({ kind: "home" })} />;
  }

  if (home === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f8f6]">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-emerald-600" />
          <p className="mt-2 text-[11px] font-bold text-slate-500">در حال بارگذاری ژن‌آموز…</p>
        </div>
      </div>
    );
  }

  const stats = home.stats;
  const goalPercent = Math.min(100, Math.round((stats.todayXp / Math.max(1, stats.dailyGoal)) * 100));

  return (
    <div className="min-h-screen bg-[#f4f8f6] text-slate-800" dir="rtl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/8 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link
            to="/dashboard?tab=academyPath"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm transition-colors hover:bg-emerald-800"
            title="بازگشت به مسیر آکادمی"
          >
            <ArrowRight className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 text-[14px] font-extrabold text-slate-900">
              <GraduationCap className="size-4 text-emerald-700" />
              ژن‌آموز
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-extrabold text-emerald-700">Genotab</span>
            </h1>
            <p className="truncate text-[9.5px] text-slate-400">یادگیری تعاملی مفاهیم زیست‌شناسی — قدم‌به‌قدم مثل یک بازی</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-600">
              <Flame className="size-3.5" /> {faNum(stats.streak)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-700">
              <Zap className="size-3.5" /> {faNum(stats.totalXp)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-600">
              <Heart className="size-3.5 text-rose-500" /> {faNum(stats.hearts)}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#0b1f1a] via-[#0f2b24] to-[#123c31] p-5 text-white shadow-lg shadow-emerald-900/15">
          <div className="pointer-events-none absolute -left-16 -top-20 size-52 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-10 size-56 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold tracking-wide text-emerald-300">دورهٔ فعال · {home.course.titleEn}</p>
              <h2 className="mt-1 text-xl font-black tracking-tight">{home.course.titleFa}</h2>
              <p className="mt-1.5 max-w-xl text-[11.5px] leading-6 text-white/70">{home.course.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[9.5px] font-bold text-white/70">
                <span className="rounded-full bg-white/10 px-2 py-1">{LEVEL_LABELS[home.course.level] ?? home.course.level}</span>
                <span className="rounded-full bg-white/10 px-2 py-1">{faNum(home.course.total)} درس</span>
                <span className="rounded-full bg-white/10 px-2 py-1">{faNum(home.course.hours)} ساعت</span>
                <span className="rounded-full bg-white/10 px-2 py-1">{home.course.prerequisites}</span>
              </div>
            </div>
            <div className="w-full sm:w-56">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <div className="flex items-end justify-between">
                  <span className="text-[10px] font-bold text-white/70">پیشرفت دوره</span>
                  <span className="text-lg font-black">{faNum(home.course.percent)}٪</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-gradient-to-l from-emerald-300 to-teal-400" style={{ width: `${home.course.percent}%` }} />
                </div>
                <p className="mt-1 text-[9.5px] text-white/55">
                  {faNum(home.course.done)} از {faNum(home.course.total)} درس کامل شده
                </p>
                <button
                  type="button"
                  disabled={!nextLessonId}
                  onClick={() => nextLessonId && setRoute({ kind: "lesson", id: nextLessonId })}
                  className="mt-2.5 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-emerald-400 px-3 py-2 text-[11.5px] font-extrabold text-emerald-950 transition-colors hover:bg-emerald-300 disabled:opacity-50"
                >
                  <Play className="size-3.5" />
                  {home.course.done === 0 ? "شروع درس اول" : nextLessonId ? "ادامهٔ یادگیری" : "دوره کامل شد"}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-white/5 px-2.5 py-1.5 text-[9.5px] text-white/70">
                <span>سطح {faNum(stats.level)}</span>
                <span className="h-1 w-20 overflow-hidden rounded-full bg-white/15">
                  <span className="block h-full rounded-full bg-emerald-300" style={{ width: `${stats.levelProgress}%` }} />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Daily goal ────────────────────────────────────────────────── */}
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-900/10 bg-white p-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold text-slate-800">چالش امروز</p>
            <p className="text-[10px] text-slate-400">
              {faNum(stats.todayXp)} از {faNum(stats.dailyGoal)} XP امروز — با یک درس به هدف می‌رسی
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={cn("h-full rounded-full", goalPercent >= 100 ? "bg-emerald-500" : "bg-amber-400")} style={{ width: `${goalPercent}%` }} />
            </div>
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-extrabold", goalPercent >= 100 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
            {goalPercent >= 100 ? "هدف امروز کامل شد ✓" : `${faNum(goalPercent)}٪`}
          </span>
        </section>

        {/* ── Learning path ─────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-emerald-900/10 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-extrabold text-slate-900">مسیر یادگیری</h3>
              <p className="text-[10.5px] text-slate-400">درس‌ها به ترتیب باز می‌شوند؛ هر فصل با آزمون ۱۵ سؤالی بسته می‌شود.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
              {faNum(home.chapters.filter((c) => c.examPassed).length)} از {faNum(home.chapters.length)} فصل تمام‌شده
            </span>
          </div>

          {path === undefined ? (
            <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-emerald-600" /></div>
          ) : path === null ? (
            <p className="py-6 text-center text-[11px] text-slate-400">مسیر دوره در دسترس نیست.</p>
          ) : (
            <div className="mt-4 space-y-5">
              {path.chapters.map((chapter, chapterIndex) => (
                <div key={chapter.id} className="relative">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-extrabold text-white">
                        {faNum(chapterIndex + 1)}
                      </span>
                      <div>
                        <p className="text-[12.5px] font-extrabold text-slate-800">{chapter.titleFa}</p>
                        <p className="text-[9.5px] text-slate-400">{chapter.description}</p>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-400">
                      {faNum(chapter.lessons.filter((lesson) => lesson.completed).length)}/{faNum(chapter.lessons.length)}
                    </span>
                  </div>

                  <div className="relative flex flex-col items-center gap-2.5 rounded-2xl bg-gradient-to-b from-slate-50/80 to-white py-3">
                    <span className="absolute inset-y-2 w-px border-l border-dashed border-emerald-900/15" aria-hidden />
                    {chapter.lessons.map((lesson, lessonIndex) => {
                      const offset = lessonIndex % 2 === 0 ? "-translate-x-10 sm:-translate-x-16" : "translate-x-10 sm:translate-x-16";
                      return (
                        <div key={lesson.id} className={cn("relative z-10 flex flex-col items-center", offset)}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!lesson.unlocked) {
                                toast.info("ابتدا درس قبلی را کامل کنید.");
                                return;
                              }
                              setRoute({ kind: "lesson", id: lesson.id });
                            }}
                            className={cn(
                              "group flex size-14 cursor-pointer flex-col items-center justify-center rounded-full border-2 text-center transition-all",
                              lesson.completed
                                ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                                : lesson.unlocked
                                  ? "border-emerald-500 bg-white text-emerald-700 shadow-sm hover:scale-105 hover:bg-emerald-50"
                                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
                            )}
                            title={`${lesson.titleFa} — ${LEVEL_LABELS[lesson.level] ?? lesson.level}`}
                          >
                            {lesson.completed ? (
                              <Check className="size-5" />
                            ) : lesson.unlocked ? (
                              <Play className="size-5" />
                            ) : (
                              <Lock className="size-4" />
                            )}
                            <span className="mt-0.5 text-[8px] font-extrabold">{faNum(lesson.order)}</span>
                          </button>
                          <span className={cn("mt-1 max-w-[130px] truncate text-center text-[9.5px] font-bold", lesson.unlocked ? "text-slate-600" : "text-slate-400")}>
                            {lesson.titleFa}
                          </span>
                          {lesson.total ? (
                            <span className={cn("text-[8.5px] font-bold", (lesson.score ?? 0) === lesson.total ? "text-emerald-600" : "text-slate-400")}>
                              {faNum(lesson.score ?? 0)}/{faNum(lesson.total)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      disabled={!chapter.examUnlocked}
                      onClick={() => setRoute({ kind: "exam", examKind: "chapter", chapterId: chapter.id })}
                      className={cn(
                        "relative z-10 mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10.5px] font-extrabold transition-colors",
                        chapter.examPassed
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : chapter.examUnlocked
                            ? "cursor-pointer border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
                      )}
                    >
                      {chapter.examPassed ? <Trophy className="size-3.5" /> : chapter.examUnlocked ? <BookOpen className="size-3.5" /> : <Lock className="size-3" />}
                      آزمون فصل
                      {chapter.examBestPercent > 0 ? <span className="font-mono text-[9px]">({faNum(chapter.examBestPercent)}٪)</span> : null}
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                disabled={!path.examUnlocked}
                onClick={() => setRoute({ kind: "exam", examKind: "course" })}
                className={cn(
                  "mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[12px] font-extrabold transition-colors",
                  path.examPassed
                    ? "border-amber-300 bg-gradient-to-l from-amber-50 to-white text-amber-800"
                    : path.examUnlocked
                      ? "cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400",
                )}
              >
                {path.examPassed ? <Trophy className="size-4" /> : <GraduationCap className="size-4" />}
                آزمون جامع دوره (۳۰ سؤال)
                <ChevronLeft className="size-4" />
              </button>
            </div>
          )}
        </section>

        {/* ── Achievements + leaderboard ────────────────────────────────── */}
        <div className="grid gap-3 lg:grid-cols-2">
          <AchievementsPanel achievements={home.achievements} />
          <LeaderboardPanel />
        </div>

        {/* ── Review + subjects ─────────────────────────────────────────── */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-extrabold text-slate-900">مرور اشتباهات</h3>
            {home.reviewCount > 0 ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9.5px] font-extrabold text-rose-600">{faNum(home.reviewCount)} سؤال</span>
            ) : null}
          </div>
          <ReviewPanel />
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-[13px] font-extrabold text-slate-900">درس‌نامهٔ ژن‌آموز</h3>
              <p className="text-[10px] text-slate-400">
                ۹ درس‌نامهٔ پایه و تخصصی؛ زیست‌شناسی سلولی کامل است و بقیه در حال تولید محتوا.
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[9.5px] font-bold text-slate-500">
              {faNum(home.totals.lessons)} درس منتشرشده · {faNum(home.totals.bankQuestions)} سؤال در بانک
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {home.subjects.map((subject) => {
              const published = subject.status === "published";
              return (
                <div
                  key={subject.id}
                  className={cn(
                    "rounded-2xl border bg-white p-3",
                    published ? "border-emerald-200 shadow-sm" : "border-slate-200 opacity-80",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-extrabold text-slate-800">{subject.titleFa}</p>
                      <p className="text-[9px] text-slate-400">{subject.titleEn}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[8.5px] font-extrabold",
                        published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {published ? "منتشرشده" : "در حال تولید"}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[10px] leading-5 text-slate-500">{subject.blurb}</p>
                  <div className="mt-2 flex items-center justify-between text-[9.5px] font-bold text-slate-400">
                    <span>
                      {published ? `${faNum(subject.doneLessons)} از ${faNum(subject.plannedLessons)} درس` : `${faNum(subject.plannedLessons)} درس برنامه‌ریزی‌شده`}
                    </span>
                    <span>{subject.phase === 1 ? "پایه" : "تخصصی"}</span>
                  </div>
                  {published ? (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((subject.doneLessons / Math.max(1, subject.plannedLessons)) * 100)}%` }} />
                    </div>
                  ) : (
                    <p className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[8.5px] text-slate-400">
                      محتوای این درس‌نامه منتشر نشده؛ هیچ درس آزمایشی نمایش داده نمی‌شود.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Integrity note ────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-emerald-900/10 bg-white/70 p-4">
          <p className="text-[10.5px] leading-6 text-slate-500">
            <b className="text-slate-700">دربارهٔ محتوا:</b> توضیح‌ها بر پایهٔ OpenStax Biology 2e، Alberts Molecular Biology of the Cell و منابع
            مرجع دیگر نوشته شده‌اند و متن آن‌ها ترجمهٔ مستقیم کتاب نیست. هر درس بخش «منابع» دارد، تصویرها نمودارهای برداری
            اختصاصی ژن‌آموزند و شبیه‌سازی‌ها صریحاً از روش آزمایشگاهی واقعی جدا شده‌اند.
          </p>
        </section>
      </main>

      <footer className="mt-auto border-t border-emerald-900/8 bg-white/70 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 text-[10px] text-slate-400">
          <span>ژن‌آموز · محصول Genova</span>
          <Link to="/dashboard?tab=academyPath" className="font-bold text-emerald-700 hover:text-emerald-800">
            بازگشت به مسیر آکادمی ←
          </Link>
        </div>
      </footer>
    </div>
  );
}

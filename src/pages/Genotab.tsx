import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Flame,
  GraduationCap,
  Loader2,
  Lock,
  Play,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";
import { LessonPlayer } from "@/components/genotab/LessonPlayer";
import { ExamPlayer } from "@/components/genotab/ExamPlayer";
import { BadgeStrip, BadgesScreen, LeaderboardPreview, LeaderboardScreen, ProgressChart, ReviewPanel } from "@/components/genotab/GenotabPanels";
import { BottomNav, Confetti, Progress, TopicTile, type GenotabScreen } from "@/components/genotab/ui";

type Route = { kind: "screen"; screen: GenotabScreen } | { kind: "lesson"; id: string } | { kind: "exam"; examKind: "chapter" | "course"; chapterId?: string };

const LEVEL_LABELS: Record<string, string> = {
  beginner: "مقدماتی",
  intermediate: "میانی",
  advanced: "پیشرفته",
  mixed: "مقدماتی تا پیشرفته",
};

const CHAPTER_ICONS = ["🔬", "🧫", "🧬", "🌀"];
const CHAPTER_TINTS = ["emerald", "sky", "violet", "teal"] as const;

export default function GenotabPage() {
  const [route, setRoute] = useState<Route>({ kind: "screen", screen: "home" });
  const home = useQuery(api.genotabLearning.home);
  const path = useQuery(api.genotabLearning.coursePath, { courseSlug: "cell-biology-intro" });

  const go = (screen: GenotabScreen) => setRoute({ kind: "screen", screen });
  const openLesson = (id: string) => setRoute({ kind: "lesson", id });
  const nextLessonId = home?.course.nextLessonId ?? null;
  const resume = () => {
    if (nextLessonId) openLesson(nextLessonId);
    else toast.info("دوره کامل شده است؛ می‌توانی درس‌ها را مرور کنی.");
  };

  if (route.kind === "lesson") {
    return <LessonPlayer key={route.id} lessonId={route.id} onExit={() => go("home")} onOpenLesson={openLesson} />;
  }
  if (route.kind === "exam") {
    return <ExamPlayer kind={route.examKind} chapterId={route.chapterId} onExit={() => go("path")} />;
  }

  if (home === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F7F3]">
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-gradient-to-b from-[#18B865] to-[#0E8F52] text-3xl shadow-lg shadow-emerald-600/25">🧬</span>
          <Loader2 className="mx-auto mt-4 size-6 animate-spin text-emerald-600" />
          <p className="mt-2 text-[11px] font-bold text-slate-500">در حال بارگذاری ژن‌آموز…</p>
        </div>
      </div>
    );
  }

  const stats = home.stats;
  const screen = route.screen;
  const nextLessonTitle = path?.chapters.flatMap((chapter) => chapter.lessons).find((lesson) => lesson.id === nextLessonId)?.titleFa;
  const heroTitle = nextLessonId ? (nextLessonTitle ?? "قدم بعدی تو") : "همهٔ ۲۰ درس کامل شد!";
  const goalPercent = Math.min(100, Math.round((stats.todayXp / Math.max(1, stats.dailyGoal)) * 100));

  return (
    <div className="min-h-screen bg-[#F2F7F3] text-slate-800" dir="rtl">
      <div className="mx-auto w-full max-w-xl pb-28">
        {/* ── App bar ───────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-emerald-900/5 bg-[#F2F7F3]/90 backdrop-blur-xl">
          <div className="flex items-center gap-2 px-4 py-2.5">
            {screen === "home" ? (
              <Link
                to="/dashboard?tab=academyPath"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-900/5"
                title="بازگشت به مسیر آکادمی"
              >
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => go("home")}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-900/5"
              >
                <ArrowRight className="size-4" />
              </button>
            )}
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-900/5">
              <span className="flex size-6 items-center justify-center rounded-full bg-emerald-50 text-[12px]">🧬</span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-extrabold text-slate-800">ژن‌آموز</p>
                <p className="truncate text-[8px] font-semibold text-slate-400">زیست‌شناسی سلولی · Genotab</p>
              </div>
              <ChevronDown className="mr-auto size-3 text-slate-300" />
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1.5 text-[9.5px] font-extrabold text-slate-700 shadow-sm ring-1 ring-emerald-900/5">
                <Zap className="size-3.5 fill-amber-400 text-amber-400" />
                {faNum(stats.totalXp)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1.5 text-[9.5px] font-extrabold text-slate-700 shadow-sm ring-1 ring-emerald-900/5">
                <Flame className="size-3.5 fill-orange-400 text-orange-400" />
                {faNum(stats.streak)}
              </span>

            </div>
          </div>
        </header>

        <main className="px-4 pt-3">
          {screen === "home" ? (
            <div className="space-y-3.5">
              {/* Hero / resume */}
              <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-l from-[#16B364] via-[#119C55] to-[#0B7A43] p-4 text-white shadow-[0_20px_40px_-26px_rgba(11,122,67,0.9)]">
                <Confetti />
                <div className="relative">
                  <p className="text-[9.5px] font-bold text-white/75">
                    {nextLessonId ? "قدم بعدی تو" : "دورهٔ زیست‌شناسی سلولی"}
                  </p>
                  <h1 className="mt-0.5 text-[16px] font-black leading-7">{heroTitle}</h1>
                  <p className="mt-0.5 text-[10px] font-semibold text-white/80">
                    {faNum(home.course.done)} از {faNum(home.course.total)} درس کامل شده · {faNum(home.course.percent)}٪
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resume}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0B1512] px-4 py-2 text-[11.5px] font-extrabold text-white shadow-lg shadow-black/20 transition-transform hover:scale-[1.02]"
                    >
                      <Play className="size-3.5 fill-white" />
                      {home.course.done === 0 ? "شروع یادگیری" : "ادامه"}
                    </button>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1.5 text-[9.5px] font-extrabold text-white/90">
                      <Trophy className="size-3" /> {faNum(home.course.percent)}٪ مسیر
                    </span>
                  </div>

                  <Progress value={home.course.percent} tone="white" className="mt-3 h-1.5" />
                </div>
              </section>

              {/* Daily goal */}
              <section className="flex items-center gap-2.5 rounded-[22px] border border-white bg-white/80 p-3 shadow-[0_10px_24px_-22px_rgba(6,60,40,0.6)]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-amber-50">
                  <Target className="size-4 text-amber-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold text-slate-800">چالش امروز</p>
                  <p className="text-[9.5px] font-semibold text-slate-400">
                    {faNum(stats.todayXp)} از {faNum(stats.dailyGoal)} XP — با یک درس کامل می‌شود
                  </p>
                  <Progress value={goalPercent} tone={goalPercent >= 100 ? "green" : "amber"} className="mt-1.5 h-1.5" />
                </div>
                <span className={cn("rounded-full px-2 py-1 text-[9px] font-extrabold", goalPercent >= 100 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                  {goalPercent >= 100 ? "کامل ✓" : `${faNum(goalPercent)}٪`}
                </span>
              </section>

              {/* Topic tiles */}
              <section>
                <div className="mb-1.5 flex items-end justify-between px-0.5">
                  <h2 className="text-[13px] font-extrabold text-slate-900">مبانی زیست‌شناسی سلولی</h2>
                  <button type="button" onClick={() => go("path")} className="flex cursor-pointer items-center gap-0.5 text-[9.5px] font-extrabold text-emerald-700">
                    مسیر کامل <ChevronLeft className="size-3" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {home.chapters.map((chapter, index) => (
                    <TopicTile
                      key={chapter.id}
                      title={chapter.titleFa}
                      caption={`${faNum(chapter.done)}/${faNum(chapter.total)} درس`}
                      icon={chapter.examPassed ? "✅" : CHAPTER_ICONS[index % CHAPTER_ICONS.length]}
                      tint={CHAPTER_TINTS[index % CHAPTER_TINTS.length]}
                      onClick={() => {
                        const target = path?.chapters.find((row) => row.id === chapter.id)?.lessons.find((lesson) => lesson.unlocked && !lesson.completed);
                        if (target) openLesson(target.id);
                        else go("path");
                      }}
                    />
                  ))}
                  <TopicTile
                    title="آزمون جامع"
                    caption="۳۰ سؤال"
                    icon="🏆"
                    tint="amber"
                    locked={!path?.examUnlocked}
                    onClick={() => {
                      if (!path?.examUnlocked) {
                        toast.info("برای آزمون جامع، اول همهٔ فصل‌ها را با آزمون ببند.");
                        return;
                      }
                      setRoute({ kind: "exam", examKind: "course" });
                    }}
                  />
                  <TopicTile
                    title="مرور اشتباهات"
                    caption={home.reviewCount > 0 ? `${faNum(home.reviewCount)} سؤال` : "خالی"}
                    icon="🔁"
                    tint="rose"
                    onClick={() => go("review")}
                  />
                  <TopicTile
                    title="نشان‌ها"
                    caption={`${faNum(home.achievements.filter((a) => a.earned).length)}/${faNum(home.achievements.length)}`}
                    icon="🏅"
                    tint="violet"
                    onClick={() => go("badges")}
                  />
                </div>
              </section>

              <ProgressChart
                weekly={home.weekly}
                dailyGoal={stats.dailyGoal}
                percentile={home.percentile}
                weeklyTotal={home.weeklyTotal}
              />

              <LeaderboardPreview onOpen={() => go("leaderboard")} />
              <BadgeStrip achievements={home.achievements} onOpen={() => go("badges")} />

              <p className="px-1 pb-2 text-[9px] leading-5 text-slate-400">
                محتوا بر پایهٔ OpenStax Biology 2e و Alberts Molecular Biology of the Cell نوشته شده و ترجمهٔ مستقیم کتاب نیست. هر درس
                بخش «منابع» دارد و نمودارها اختصاصی ژن‌آموزند.
              </p>
            </div>
          ) : null}

          {screen === "path" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[15px] font-black text-slate-900">مسیر یادگیری</h1>
                  <p className="text-[9.5px] font-semibold text-slate-400">درس‌ها به ترتیب باز می‌شوند — هر فصل با آزمون ۱۵ سؤالی بسته می‌شود</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[9px] font-extrabold text-emerald-700 shadow-sm">
                  {faNum(home.chapters.filter((c) => c.examPassed).length)}/{faNum(home.chapters.length)} فصل
                </span>
              </div>

              {path === undefined ? (
                <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-emerald-600" /></div>
              ) : path === null ? (
                <p className="py-6 text-center text-[11px] text-slate-400">مسیر دوره در دسترس نیست.</p>
              ) : (
                <div className="space-y-3">
                  {path.chapters.map((chapter, chapterIndex) => (
                    <section key={chapter.id} className="overflow-hidden rounded-[26px] border border-white bg-white shadow-[0_14px_30px_-26px_rgba(6,60,40,0.7)]">
                      <div className="flex items-center gap-2 px-3.5 pt-3">
                        <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-600 text-[10px] font-black text-white">
                          {faNum(chapterIndex + 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-extrabold text-slate-800">{chapter.titleFa}</p>
                          <p className="truncate text-[9px] text-slate-400">{chapter.description}</p>
                        </div>
                        <span className="text-[9px] font-extrabold text-slate-400">
                          {faNum(chapter.lessons.filter((lesson) => lesson.completed).length)}/{faNum(chapter.lessons.length)}
                        </span>
                      </div>

                      <div className="relative flex flex-col items-center gap-3 px-3 py-4">
                        <span className="absolute inset-y-4 right-1/2 w-px border-l-2 border-dashed border-emerald-100" aria-hidden />
                        {chapter.lessons.map((lesson, lessonIndex) => {
                          const offset = lessonIndex % 2 === 0 ? "-translate-x-10" : "translate-x-10";
                          return (
                            <div key={lesson.id} className={cn("relative z-10 flex flex-col items-center", offset)}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!lesson.unlocked) {
                                    toast.info("ابتدا درس قبلی را کامل کن.");
                                    return;
                                  }
                                  openLesson(lesson.id);
                                }}
                                className={cn(
                                  "group flex size-14 cursor-pointer flex-col items-center justify-center rounded-full border-b-4 text-center transition-all",
                                  lesson.completed
                                    ? "border-emerald-800 bg-emerald-600 text-white hover:bg-emerald-700"
                                    : lesson.unlocked
                                      ? "border-emerald-700 bg-[#12B76A] text-white hover:-translate-y-0.5"
                                      : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
                                )}
                                title={`${lesson.titleFa} — ${LEVEL_LABELS[lesson.level] ?? lesson.level}`}
                              >
                                {lesson.completed ? <Check className="size-5" /> : lesson.unlocked ? <Play className="size-5 fill-white" /> : <Lock className="size-4" />}
                                <span className="mt-0.5 text-[8px] font-black">{faNum(lesson.order)}</span>
                              </button>
                              <span className={cn("mt-1 max-w-[128px] truncate text-center text-[9.5px] font-bold", lesson.unlocked ? "text-slate-600" : "text-slate-400")}>
                                {lesson.titleFa}
                              </span>
                              {lesson.total ? (
                                <span className={cn("text-[8.5px] font-extrabold", (lesson.score ?? 0) === lesson.total ? "text-emerald-600" : "text-slate-400")}>
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
                            "relative z-10 mt-1 inline-flex items-center gap-1.5 rounded-full border-b-2 px-3 py-2 text-[10px] font-extrabold transition-colors",
                            chapter.examPassed
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : chapter.examUnlocked
                                ? "cursor-pointer border-violet-300 bg-violet-100 text-violet-700 hover:bg-violet-200"
                                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
                          )}
                        >
                          {chapter.examPassed ? <Trophy className="size-3.5" /> : chapter.examUnlocked ? <BookOpen className="size-3.5" /> : <Lock className="size-3" />}
                          آزمون فصل
                          {chapter.examBestPercent > 0 ? <span className="font-mono text-[9px]">({faNum(chapter.examBestPercent)}٪)</span> : null}
                        </button>
                      </div>
                    </section>
                  ))}

                  <button
                    type="button"
                    disabled={!path.examUnlocked}
                    onClick={() => setRoute({ kind: "exam", examKind: "course" })}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-[12px] font-extrabold shadow-sm transition-colors",
                      path.examPassed
                        ? "bg-gradient-to-l from-amber-100 to-white text-amber-800 ring-1 ring-amber-200"
                        : path.examUnlocked
                          ? "cursor-pointer bg-[#0B1512] text-white hover:bg-black"
                          : "cursor-not-allowed bg-slate-100 text-slate-400",
                    )}
                  >
                    {path.examPassed ? <Trophy className="size-4" /> : <GraduationCap className="size-4" />}
                    آزمون جامع دوره (۳۰ سؤال)
                    <ChevronLeft className="size-4" />
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {screen === "leaderboard" ? <LeaderboardScreen userName={home.userName} /> : null}
          {screen === "badges" ? <BadgesScreen achievements={home.achievements} /> : null}
          {screen === "review" ? (
            <div className="space-y-3">
              <div>
                <h1 className="text-[15px] font-black text-slate-900">مرور اشتباهات</h1>
                <p className="text-[9.5px] font-semibold text-slate-400">هر پاسخ غلط با پاسخ درست و توضیح علمی، تا وقتی «مرور شد» بزنی</p>
              </div>
              <ReviewPanel />
            </div>
          ) : null}
        </main>
      </div>

      <BottomNav active={screen} onNavigate={go} onResume={resume} resumeDisabled={!nextLessonId} />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Heart,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";
import { Diagram } from "./Diagrams";
import { ExerciseView, type AnswerFeedback, type GenotabExercise } from "./ExerciseView";

type Phase = "cards" | "practice" | "assessmentIntro" | "assessment" | "result";

interface CompleteResult {
  score: number;
  total: number;
  percent: number;
  perfect: boolean;
  firstCompletion: boolean;
  xpEarned: number;
  streak: number;
  nextLessonId: string | null;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "مقدماتی",
  intermediate: "میانی",
  advanced: "پیشرفته",
};

export function LessonPlayer({
  lessonId,
  onExit,
  onOpenLesson,
}: {
  lessonId: string;
  onExit: () => void;
  onOpenLesson: (id: string) => void;
}) {
  const view = useQuery(api.genotabLearning.lessonView, { lessonId });
  const saveCard = useMutation(api.genotabLearning.saveCard);
  const gradeOne = useMutation(api.genotabLearning.gradeOne);
  const completeLesson = useMutation(api.genotabLearning.completeLesson);

  const [phase, setPhase] = useState<Phase>("cards");
  const [cardIndex, setCardIndex] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [assessmentIndex, setAssessmentIndex] = useState(0);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [pending, setPending] = useState(false);
  const [answers, setAnswers] = useState<{ exerciseId: string; response: string }[]>([]);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resumed = useRef(false);
  const lastResponse = useRef("");

  useEffect(() => {
    if (resumed.current || !view) return;
    resumed.current = true;
    if (view.progress?.status === "started" && view.progress.cardIndex > 0) {
      setCardIndex(Math.min(view.progress.cardIndex, view.cards.length - 1));
    }
  }, [view]);

  if (view === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (view === null) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm font-bold text-slate-600">این درس یافت نشد.</p>
        <button type="button" onClick={onExit} className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white">
          بازگشت
        </button>
      </div>
    );
  }

  const card = view.cards[cardIndex];
  const practice = view.practice[practiceIndex] as GenotabExercise | undefined;
  const assessment = view.assessment[assessmentIndex] as GenotabExercise | undefined;
  const totalSteps = view.cards.length + 2 + view.practice.length + view.assessment.length + 1;
  const doneSteps =
    phase === "cards"
      ? cardIndex
      : phase === "practice"
        ? view.cards.length + 1 + practiceIndex
        : phase === "assessmentIntro"
          ? view.cards.length + 1 + view.practice.length
          : phase === "assessment"
            ? view.cards.length + 2 + view.practice.length + assessmentIndex
            : totalSteps;

  const submit = async (exercise: GenotabExercise, response: string) => {
    setPending(true);
    try {
      const row = await gradeOne({ exerciseId: exercise.id, response });
      setFeedback({ correct: row.correct, explain: row.explain, correctAnswer: row.correctAnswer, xp: row.xp, hearts: row.hearts });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ثبت پاسخ ناموفق بود.");
    } finally {
      setPending(false);
    }
  };

  const nextCard = () => {
    void saveCard({ lessonId: view.id, cardIndex }).catch(() => undefined);
    if (cardIndex < view.cards.length - 1) {
      setCardIndex(cardIndex + 1);
    } else {
      setPhase("practice");
      setFeedback(null);
      setPracticeIndex(0);
    }
  };

  const nextPractice = () => {
    setFeedback(null);
    if (practiceIndex < view.practice.length - 1) setPracticeIndex(practiceIndex + 1);
    else setPhase("assessmentIntro");
  };

  const finishAssessment = async () => {
    if (!assessment) return;
    const collected = [...answers, { exerciseId: assessment.id, response: lastResponse.current }];
    setAnswers(collected);
    setFeedback(null);
    if (assessmentIndex < view.assessment.length - 1) {
      setAssessmentIndex(assessmentIndex + 1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await completeLesson({ lessonId: view.id, answers: collected });
      setResult(res);
      setPhase("result");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ثبت نتیجهٔ درس ناموفق بود.");
    } finally {
      setSubmitting(false);
    }
  };

  const restart = (nextLessonId?: string | null) => {
    setResult(null);
    setPhase("cards");
    setCardIndex(0);
    setPracticeIndex(0);
    setAssessmentIndex(0);
    setFeedback(null);
    setAnswers([]);
    if (nextLessonId) onOpenLesson(nextLessonId);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f9fbfa]" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-emerald-900/8 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={onExit}
            className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-bold text-slate-500 hover:bg-slate-100"
          >
            <ChevronRight className="size-4" />
            خروج
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-extrabold text-slate-500">{view.titleFa}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.round((doneSteps / totalSteps) * 100)}%` }} />
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-600">
            <Heart className="size-3" /> {faNum(view.stats.hearts)}
          </span>
          <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-700 sm:inline-flex">
            <Sparkles className="size-3" /> {faNum(view.stats.totalXp)} XP
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {phase === "cards" && card ? (
          <div className="space-y-4">
            {cardIndex === 0 ? (
              <section className="rounded-3xl border border-emerald-900/10 bg-gradient-to-l from-emerald-700 to-teal-600 p-5 text-white">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                  <span className="rounded-full bg-white/15 px-2 py-1">درس {faNum(view.order)}</span>
                  <span className="rounded-full bg-white/15 px-2 py-1">{LEVEL_LABELS[view.level] ?? view.level}</span>
                  <span className="rounded-full bg-white/15 px-2 py-1">~{faNum(view.minutes)} دقیقه</span>
                </div>
                <h1 className="mt-2 text-lg font-extrabold leading-7">{view.titleFa}</h1>
                <p className="text-[10.5px] text-white/60">{view.titleEn}</p>
                <p className="mt-2 text-[12px] leading-6 text-white/85">{view.intro}</p>
                <div className="mt-3 rounded-2xl bg-white/10 p-3">
                  <p className="flex items-center gap-1 text-[10.5px] font-extrabold text-white/90">
                    <Target className="size-3.5" /> هدف‌های این درس
                  </p>
                  <ul className="mt-1 space-y-1">
                    {view.objectives.slice(0, 3).map((objective) => (
                      <li key={objective} className="text-[11px] leading-5 text-white/80">
                        • {objective}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-emerald-900/10 bg-white p-4 shadow-sm sm:p-5">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                کارت {faNum(cardIndex + 1)} از {faNum(view.cards.length)}
              </span>
              <h2 className="mt-2 text-[15px] font-extrabold leading-7 text-slate-900">{card.title}</h2>
              <p className="mt-2 text-[12.5px] leading-7 text-slate-700">{card.body}</p>

              {card.terms?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {card.terms.map((term) => (
                    <span key={`${term.fa}-${term.en}`} className="rounded-full border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-[10px] font-bold text-emerald-800">
                      {term.fa} <span className="font-mono text-[9px] text-emerald-600/80">{term.en}</span>
                    </span>
                  ))}
                </div>
              ) : null}

              {card.diagram ? (
                <figure className="mt-3">
                  <Diagram kind={card.diagram} />
                  {card.caption ? <figcaption className="mt-1.5 text-[10.5px] leading-5 text-slate-500">{card.caption}</figcaption> : null}
                </figure>
              ) : null}

              {card.lab ? (
                <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-sky-50 px-2.5 py-2 text-[11px] leading-6 text-sky-900">
                  <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
                  <span>{card.lab}</span>
                </p>
              ) : null}

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCardIndex(Math.max(0, cardIndex - 1))}
                  disabled={cardIndex === 0}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-[11.5px] font-bold text-slate-500 disabled:opacity-40"
                >
                  <ChevronRight className="size-3.5" />
                  قبلی
                </button>
                <button
                  type="button"
                  onClick={nextCard}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2 text-[12px] font-extrabold text-white hover:bg-emerald-800"
                >
                  {cardIndex === view.cards.length - 1 ? "شروع تمرین" : "ادامه"}
                  <ChevronLeft className="size-3.5" />
                </button>
              </div>
            </section>

            {view.practical ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-800">
                  <BookOpen className="size-3.5 text-emerald-700" /> {view.practical.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-6 text-slate-600">{view.practical.body}</p>
                {view.practical.items?.length ? (
                  <ul className="mt-2 space-y-1">
                    {view.practical.items.map((item) => (
                      <li key={item} className="text-[11px] leading-6 text-slate-600">
                        • {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {view.practical.safety ? (
                  <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[10.5px] leading-5 text-amber-800">
                    <b>ایمنی:</b> {view.practical.safety}
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {phase === "practice" && practice ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-800">
                <Lightbulb className="size-4 text-amber-500" /> تمرین تعاملی
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-500">
                پاسخ درست ۵ XP دارد؛ پاسخ غلط یک قلب کم می‌کند و در مرور اشتباهات می‌ماند.
              </p>
            </div>
            <ExerciseView
              key={practice.id}
              exercise={practice}
              index={practiceIndex}
              total={view.practice.length}
              feedback={feedback}
              pending={pending}
              onSubmit={(response) => {
                lastResponse.current = response;
                void submit(practice, response);
              }}
              onNext={nextPractice}
              nextLabel={practiceIndex === view.practice.length - 1 ? "ادامه به آزمون درس" : "تمرین بعدی"}
            />
          </div>
        ) : null}

        {phase === "assessmentIntro" ? (
          <section className="rounded-3xl border border-emerald-900/10 bg-white p-5 text-center shadow-sm">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50">
              <Target className="size-7 text-emerald-600" />
            </span>
            <h2 className="mt-3 text-[15px] font-extrabold text-slate-900">آزمون درس: ۵ سؤال</h2>
            <p className="mx-auto mt-1 max-w-md text-[11.5px] leading-6 text-slate-500">
              هر پاسخ بلافاصله با توضیح علمی بررسی می‌شود. نمرهٔ کامل ۱۵ XP جایزهٔ اضافه دارد. سؤال‌ها از بانک ۱۰ سؤالی این درس
              انتخاب شده‌اند.
            </p>
            <button
              type="button"
              onClick={() => {
                setAnswers([]);
                setAssessmentIndex(0);
                setFeedback(null);
                setPhase("assessment");
              }}
              className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-700 px-6 py-2.5 text-[12.5px] font-extrabold text-white hover:bg-emerald-800"
            >
              شروع آزمون
              <ChevronLeft className="size-4" />
            </button>
          </section>
        ) : null}

        {phase === "assessment" && assessment ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 shadow-sm">
              <p className="text-[12px] font-extrabold text-slate-800">آزمون درس</p>
              <p className="text-[10.5px] font-bold text-slate-400">
                {faNum(assessmentIndex + 1)} / {faNum(view.assessment.length)}
              </p>
            </div>
            <ExerciseView
              key={assessment.id}
              exercise={assessment}
              index={assessmentIndex}
              total={view.assessment.length}
              feedback={feedback}
              pending={pending}
              onSubmit={(response) => {
                lastResponse.current = response;
                void submit(assessment, response);
              }}
              onNext={() => void finishAssessment()}
              nextLabel={assessmentIndex === view.assessment.length - 1 ? "ثبت نتیجه" : "سؤال بعدی"}
            />
            {submitting ? (
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Loader2 className="size-3.5 animate-spin" /> در حال ثبت نتیجه…
              </p>
            ) : null}
          </div>
        ) : null}

        {phase === "result" && result ? (
          <div className="space-y-4">
            <section className="rounded-3xl border border-emerald-900/10 bg-white p-5 text-center shadow-sm">
              <span className={cn("mx-auto flex size-16 items-center justify-center rounded-full", result.percent >= 80 ? "bg-emerald-50" : "bg-amber-50")}>
                {result.percent >= 80 ? <CheckCircle2 className="size-8 text-emerald-600" /> : <RotateCcw className="size-8 text-amber-600" />}
              </span>
              <h2 className="mt-2 text-[16px] font-extrabold text-slate-900">{result.percent >= 80 ? "درس کامل شد" : "آزمون ثبت شد"}</h2>
              <p className="mt-1 text-[11.5px] text-slate-500">
                {faNum(result.score)} از {faNum(result.total)} پاسخ درست ({faNum(result.percent)}٪)
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold text-amber-700">+{faNum(result.xpEarned)} XP</span>
                <span className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-extrabold text-rose-600">🔥 {faNum(result.streak)} روز پیوسته</span>
                {result.perfect ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">💯 بی‌نقص</span>
                ) : null}
              </div>
              {!result.firstCompletion ? (
                <p className="mt-2 text-[10.5px] text-slate-400">این درس قبلاً کامل شده بود؛ XP تکرار تعلق نمی‌گیرد.</p>
              ) : null}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {result.nextLessonId ? (
                  <button
                    type="button"
                    onClick={() => restart(result.nextLessonId)}
                    className="flex-1 cursor-pointer rounded-full bg-emerald-700 px-4 py-2.5 text-[12.5px] font-extrabold text-white hover:bg-emerald-800"
                  >
                    درس بعدی
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onExit}
                  className="flex-1 cursor-pointer rounded-full border border-slate-200 px-4 py-2.5 text-[12.5px] font-extrabold text-slate-600 hover:bg-slate-50"
                >
                  بازگشت به مسیر
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[12px] font-extrabold text-slate-800">جمع‌بندی درس</p>
              <ul className="mt-2 space-y-1">
                {view.summary.takeaways.map((takeaway) => (
                  <li key={takeaway} className="flex gap-1.5 text-[11.5px] leading-6 text-slate-600">
                    <CheckCircle2 className="mt-1 size-3 shrink-0 text-emerald-500" />
                    {takeaway}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {view.summary.terms.map((term) => (
                  <span key={`${term.fa}-${term.en}`} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                    {term.fa} <span className="font-mono text-[9px] text-slate-400">{term.en}</span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[10.5px] leading-5 text-slate-500">
                <b>پیشنهاد مرور:</b> {view.summary.review.join(" · ")}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[11px] font-extrabold text-slate-700">منابع علمی این درس</p>
              <ul className="mt-1.5 space-y-1">
                {view.refs.map((ref) => (
                  <li key={ref.url}>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:underline"
                    >
                      <ArrowRight className="size-3 rotate-180" />
                      {ref.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, Loader2, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";
import { ExerciseView, type AnswerFeedback, type GenotabExercise } from "./ExerciseView";

interface ExamResult {
  score: number;
  total: number;
  percent: number;
  passCount: number;
  passed: boolean;
  firstPass: boolean;
  xpEarned: number;
}

export function ExamPlayer({
  kind,
  chapterId,
  onExit,
}: {
  kind: "chapter" | "course";
  chapterId?: string;
  onExit: () => void;
}) {
  const view = useQuery(api.genotabLearning.examView, { kind, chapterId });
  const gradeOne = useMutation(api.genotabLearning.gradeOne);
  const submitExam = useMutation(api.genotabLearning.submitExam);

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [pending, setPending] = useState(false);
  const [answers, setAnswers] = useState<{ exerciseId: string; response: string }[]>([]);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastResponse = useRef("");

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
        <p className="text-sm font-bold text-slate-600">آزمون در دسترس نیست.</p>
        <button type="button" onClick={onExit} className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white">
          بازگشت
        </button>
      </div>
    );
  }

  const question = view.questions[index] as GenotabExercise | undefined;

  const submitAnswer = async (exercise: GenotabExercise, response: string) => {
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

  const next = async () => {
    if (!question) return;
    const collected = [...answers, { exerciseId: question.id, response: lastResponse.current }];
    setAnswers(collected);
    setFeedback(null);
    if (index < view.questions.length - 1) {
      setIndex(index + 1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitExam({ kind, chapterId, answers: collected });
      setResult(res);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ثبت آزمون ناموفق بود.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10" dir="rtl">
        <section className="rounded-3xl border border-emerald-900/10 bg-white p-6 text-center shadow-sm">
          <span className={cn("mx-auto flex size-16 items-center justify-center rounded-full", result.passed ? "bg-emerald-50" : "bg-rose-50")}>
            {result.passed ? <CheckCircle2 className="size-8 text-emerald-600" /> : <XCircle className="size-8 text-rose-500" />}
          </span>
          <h2 className="mt-2 text-[16px] font-extrabold text-slate-900">{result.passed ? "قبول شدید" : "این بار قبول نشدید"}</h2>
          <p className="mt-1 text-[11.5px] text-slate-500">
            {faNum(result.score)} از {faNum(result.total)} پاسخ درست ({faNum(result.percent)}٪) — حد قبولی {faNum(result.passCount)} پاسخ
          </p>
          {result.xpEarned > 0 ? (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold text-amber-700">
              <Sparkles className="size-3.5" /> +{faNum(result.xpEarned)} XP
            </span>
          ) : null}
          {result.passed && !result.firstPass ? (
            <p className="mt-2 text-[10.5px] text-slate-400">این آزمون قبلاً قبول شده بود؛ XP تکرار تعلق نمی‌گیرد.</p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAnswers([]);
                setIndex(0);
                setStarted(true);
              }}
              className="flex-1 cursor-pointer rounded-full border border-slate-200 px-4 py-2.5 text-[12px] font-extrabold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="ml-1 inline size-3.5" /> تلاش دوباره
            </button>
            <button
              type="button"
              onClick={onExit}
              className="flex-1 cursor-pointer rounded-full bg-emerald-700 px-4 py-2.5 text-[12px] font-extrabold text-white hover:bg-emerald-800"
            >
              بازگشت به مسیر
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10" dir="rtl">
        <section className="rounded-3xl border border-emerald-900/10 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">📝</span>
          <h1 className="mt-3 text-[15px] font-extrabold text-slate-900">{view.titleFa}</h1>
          <p className="mt-2 text-[11.5px] leading-6 text-slate-500">
            {faNum(view.count)} سؤال تصادفی از بانک سؤالات این {kind === "chapter" ? "فصل" : "دوره"} — بدون محدودیت تعداد تلاش.
            حد قبولی {faNum(view.passCount)} پاسخ درست است.
          </p>
          <p className="mt-1 text-[10.5px] text-slate-400">
            تلاش‌های قبلی: {faNum(view.attempts)} {view.bestPercent > 0 ? `· بهترین نمره ${faNum(view.bestPercent)}٪` : ""}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onExit}
              className="flex-1 cursor-pointer rounded-full border border-slate-200 px-4 py-2.5 text-[12px] font-extrabold text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="ml-1 inline size-3.5" /> بازگشت
            </button>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="flex-1 cursor-pointer rounded-full bg-emerald-700 px-4 py-2.5 text-[12px] font-extrabold text-white hover:bg-emerald-800"
            >
              شروع آزمون
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6" dir="rtl">
      <header className="mb-3 flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 shadow-sm">
        <div>
          <p className="text-[11.5px] font-extrabold text-slate-800">{view.titleFa}</p>
          <p className="text-[10px] text-slate-400">
            سؤال {faNum(index + 1)} از {faNum(view.questions.length)}
          </p>
        </div>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(((index + 1) / view.questions.length) * 100)}%` }} />
        </div>
      </header>

      {question ? (
        <ExerciseView
          key={question.id}
          exercise={question}
          index={index}
          total={view.questions.length}
          feedback={feedback}
          pending={pending}
          onSubmit={(response) => {
            lastResponse.current = response;
            void submitAnswer(question, response);
          }}
          onNext={() => void next()}
          nextLabel={index === view.questions.length - 1 ? "ثبت آزمون" : "سؤال بعدی"}
        />
      ) : null}

      {submitting ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500">
          <Loader2 className="size-3.5 animate-spin" /> در حال تصحیح آزمون…
        </p>
      ) : null}
    </div>
  );
}

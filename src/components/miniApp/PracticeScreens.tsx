/**
 * Mini App — Exams + Daily Quiz
 * ─────────────────────────────────────────────────────────────────────────────
 * Reuses the existing Genova exam backend as-is; no scoring logic is copied to
 * the client. Every answer is graded server-side:
 *
 *   • tests.listExams        → published exams (with question counts)
 *   • tests.getExam          → exam + questions (server-owned)
 *   • tests.submitExam       → server grades and returns the attempt
 *   • tests.getMyAttempts    → past results
 *   • tests.getDailyQuiz     → today's question + my answer (if already given)
 *   • tests.answerDailyQuiz  → server grades the daily quiz and awards points
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Sparkles,
  Target,
  Timer,
  XCircle,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { faNum, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Chip,
  MiniButton,
  MiniCard,
  MiniEmpty,
  MiniLoading,
  ProgressBar,
  ScreenHeader,
  SectionTitle,
  type MiniNav,
} from "./ui";

// ── Exam list ───────────────────────────────────────────────────────────────

export function ExamsScreen({ nav }: { nav: MiniNav }) {
  const exams = useQuery(api.tests.listExams, {});
  const attempts = useQuery(api.tests.getMyAttempts, {});

  const bestByExam = useMemo(() => {
    const map = new Map<string, number>();
    for (const attempt of attempts ?? []) {
      const key = attempt.examId as unknown as string;
      const best = map.get(key) ?? 0;
      if (attempt.percent > best) map.set(key, attempt.percent);
    }
    return map;
  }, [attempts]);

  return (
    <div className="pb-4">
      <h2 className="mb-3 text-base font-bold">آزمونها</h2>

      {/* Daily quiz banner */}
      <MiniCard
        className="mb-3 border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white"
        onClick={() => nav({ name: "quiz" })}
      >
        <div className="flex items-center gap-2">
          <Zap className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">آزمون روزانه</p>
            <p className="mt-0.5 text-[11px] opacity-90">
              پاسخ درست ۳ امتیاز، پاسخ غلط −۱ امتیاز
            </p>
          </div>
          <ChevronLeft className="size-5 shrink-0 rotate-180 opacity-80" />
        </div>
      </MiniCard>

      <SectionTitle title="آزمونهای آماده" />
      {exams === undefined ? (
        <MiniLoading />
      ) : exams.length === 0 ? (
        <MiniEmpty icon={ListChecks} title="آزمونی منتشر نشده است" />
      ) : (
        <div className="space-y-2">
          {exams.map((exam) => {
            const best = bestByExam.get(exam._id as unknown as string);
            return (
              <MiniCard key={exam._id} onClick={() => nav({ name: "exam", slug: exam.slug })}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold">{exam.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {exam.description}
                    </p>
                  </div>
                  <Chip tone={exam.free ? "success" : "neutral"}>
                    {exam.free ? "رایگان" : "ویژه"}
                  </Chip>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{faNum(exam.questionCount)} سؤال</span>
                  <span>{faNum(exam.durationMinutes)} دقیقه</span>
                  {best !== undefined ? (
                    <span className="text-teal-600 dark:text-teal-400">
                      بهترین نتیجه: {faNum(best)}٪
                    </span>
                  ) : null}
                </div>
              </MiniCard>
            );
          })}
        </div>
      )}

      {/* Previous attempts */}
      <SectionTitle title="نتایج قبلی من" />
      {attempts === undefined ? (
        <MiniLoading />
      ) : attempts.length === 0 ? (
        <MiniEmpty icon={Target} title="هنوز آزمونی ندادی" />
      ) : (
        <div className="space-y-2">
          {attempts.slice(0, 8).map((attempt) => (
            <MiniCard key={attempt._id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-semibold">
                    {attempt.exam?.title ?? "آزمون"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDateTime(attempt.finishedAt)}
                  </p>
                </div>
                <Chip
                  tone={
                    attempt.percent >= 80 ? "success" : attempt.percent >= 50 ? "warn" : "danger"
                  }
                >
                  {faNum(attempt.percent)}٪
                </Chip>
              </div>
            </MiniCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Exam runner ─────────────────────────────────────────────────────────────

export function ExamRunnerScreen({
  slug,
  onBack,
}: {
  slug: string;
  onBack: () => void;
}) {
  const exam = useQuery(api.tests.getExam, { slug });
  const submitExam = useMutation(api.tests.submitExam);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    percent: number;
    score: number;
    total: number;
  } | null>(null);
  const submittedRef = useRef(false);

  // Start the countdown once the exam arrives (server-owned duration).
  useEffect(() => {
    if (exam && secondsLeft === null) setSecondsLeft(exam.durationMinutes * 60);
  }, [exam, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const timer = setInterval(
      () => setSecondsLeft((value) => (value === null ? null : value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const submit = async () => {
    if (!exam || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const attempt = await submitExam({
        examId: exam._id,
        answers: Object.entries(answers).map(([questionId, chosenIndex]) => ({
          questionId: questionId as never,
          chosenIndex,
        })),
      });
      setResult({
        percent: attempt?.percent ?? 0,
        score: attempt?.score ?? 0,
        total: attempt?.total ?? 0,
      });
    } catch (e) {
      submittedRef.current = false;
      setError(e instanceof Error ? e.message : "خطا در ثبت آزمون");
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit when the timer runs out (same behaviour as the web exam page).
  useEffect(() => {
    if (secondsLeft === 0 && !submitting && !result) void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, submitting, result]);

  if (exam === undefined) {
    return (
      <div className="pb-4">
        <ScreenHeader title="آزمون" onBack={onBack} />
        <MiniLoading label="در حال بارگذاری آزمون…" />
      </div>
    );
  }
  if (!exam) {
    return (
      <div className="pb-4">
        <ScreenHeader title="آزمون" onBack={onBack} />
        <MiniEmpty icon={ListChecks} title="آزمون پیدا نشد" />
      </div>
    );
  }

  // ── Result view ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="pb-4">
        <ScreenHeader title={exam.title} onBack={onBack} />
        <MiniCard className="border-0 bg-gradient-to-br from-teal-500 to-emerald-600 py-6 text-center text-white">
          <Sparkles className="mx-auto size-7" />
          <p className="mt-2 text-3xl font-black">{faNum(result.percent)}٪</p>
          <p className="mt-1 text-xs opacity-90">
            {faNum(result.score)} پاسخ درست از {faNum(result.total)} سؤال
          </p>
        </MiniCard>
        <div className="mt-3">
          <MiniButton variant="outline" className="w-full" onClick={onBack}>
            بازگشت به فهرست آزمونها
          </MiniButton>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          نتیجه در پروفایل یادگیری شما ثبت شد.
        </p>
      </div>
    );
  }

  const questions = exam.questions ?? [];
  const question = questions[current];
  const answeredCount = Object.keys(answers).length;
  const mm = Math.floor((secondsLeft ?? 0) / 60);
  const ss = (secondsLeft ?? 0) % 60;

  return (
    <div className="pb-4">
      <ScreenHeader
        title={exam.title}
        onBack={onBack}
        trailing={
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold",
              (secondsLeft ?? 0) <= 30 ? "text-destructive" : "",
            )}
          >
            <Timer className="size-3" />
            <span dir="ltr">
              {faNum(mm)}:{faNum(String(ss).padStart(2, "0"))}
            </span>
          </span>
        }
      />

      <ProgressBar percent={(answeredCount / Math.max(1, questions.length)) * 100} />
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {faNum(answeredCount)} از {faNum(questions.length)} پاسخ داده شده
      </p>

      {question ? (
        <>
          <MiniCard className="mt-3">
            {question.topic?.name ? (
              <Chip tone="info">{question.topic.name}</Chip>
            ) : null}
            <p className="mt-2 text-sm font-bold leading-7">{question.text}</p>

            <div className="mt-3 space-y-2">
              {question.options.map((option, index) => {
                const selected = answers[question._id] === index;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [question._id]: index }))}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-right text-xs leading-6 transition-colors",
                      selected
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40"
                        : "active:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                        selected ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {faNum(index + 1)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </button>
                );
              })}
            </div>
          </MiniCard>

          <div className="mt-3 flex items-center gap-2">
            <MiniButton
              variant="outline"
              disabled={current === 0}
              onClick={() => setCurrent((value) => Math.max(0, value - 1))}
            >
              <ChevronRight className="size-3" />
              قبلی
            </MiniButton>
            <span className="flex-1 text-center text-[11px] text-muted-foreground">
              سؤال {faNum(current + 1)} از {faNum(questions.length)}
            </span>
            {current < questions.length - 1 ? (
              <MiniButton onClick={() => setCurrent((value) => value + 1)}>
                بعدی
                <ChevronLeft className="size-3" />
              </MiniButton>
            ) : (
              <MiniButton onClick={submit} disabled={submitting}>
                {submitting ? "در حال ثبت…" : "ثبت آزمون"}
              </MiniButton>
            )}
          </div>
        </>
      ) : (
        <MiniEmpty icon={ListChecks} title="سؤالی برای این آزمون ثبت نشده" />
      )}

      {error ? (
        <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-center text-[11px] text-destructive">
          {error}
        </p>
      ) : null}

      {questions.length > 0 && current < questions.length - 1 ? (
        <div className="mt-3">
          <MiniButton className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "در حال ثبت…" : "پایان و ثبت آزمون"}
          </MiniButton>
        </div>
      ) : null}
    </div>
  );
}

// ── Daily quiz ──────────────────────────────────────────────────────────────

export function DailyQuizScreen({ onBack }: { onBack: () => void }) {
  const quiz = useQuery(api.tests.getDailyQuiz, {});
  const profile = useQuery(api.tests.getMyLearningProfile, {});
  const answerQuiz = useMutation(api.tests.answerDailyQuiz);

  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<
    { correct: boolean; correctIndex: number; points: number } | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reflect an answer that was already submitted (e.g. from the bot).
  useEffect(() => {
    if (quiz?.myAnswer) {
      setChosen(quiz.myAnswer.chosenIndex);
      setResult({
        correct: quiz.myAnswer.correct,
        correctIndex: quiz.myAnswer.correctIndex,
        points: quiz.myAnswer.points,
      });
    }
  }, [quiz]);

  const handleAnswer = async (index: number) => {
    if (!quiz || result || busy) return;
    setChosen(index);
    setBusy(true);
    setError(null);
    try {
      const res = await answerQuiz({ questionId: quiz.question._id, chosenIndex: index });
      setResult(res);
    } catch (e) {
      setChosen(null);
      setError(e instanceof Error ? e.message : "خطا در ثبت پاسخ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-4">
      <ScreenHeader title="آزمون روزانه" onBack={onBack} />

      {quiz === undefined ? (
        <MiniLoading label="در حال بارگذاری کوئیز امروز…" />
      ) : !quiz ? (
        <MiniEmpty
          icon={Zap}
          title="کوئیز امروز منتشر نشده است"
          description="هر روز یک سؤال جدید منتشر میشود."
        />
      ) : (
        <>
          <MiniCard>
            <div className="flex items-center justify-between gap-2">
              {quiz.question.topic?.name ? (
                <Chip tone="info">{quiz.question.topic.name}</Chip>
              ) : (
                <Chip>عمومی</Chip>
              )}
              <Chip tone="warn">امتیاز این سؤال: {faNum(quiz.points)}</Chip>
            </div>
            <p className="mt-2 text-sm font-bold leading-7">{quiz.question.text}</p>

            <div className="mt-3 space-y-2">
              {quiz.question.options.map((option, index) => {
                const isChosen = chosen === index;
                const isCorrect = result && result.correctIndex === index;
                const isWrongChoice = result && isChosen && !result.correct;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!!result || busy}
                    onClick={() => handleAnswer(index)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-right text-xs leading-6 transition-colors disabled:cursor-default",
                      isCorrect
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                        : isWrongChoice
                          ? "border-destructive bg-destructive/10"
                          : isChosen
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40"
                            : "active:bg-muted/60",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
                      {faNum(index + 1)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {isCorrect ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    ) : isWrongChoice ? (
                      <XCircle className="size-4 shrink-0 text-destructive" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </MiniCard>

          {result ? (
            <MiniCard className="mt-3 text-center">
              <p
                className={cn(
                  "text-sm font-bold",
                  result.correct
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive",
                )}
              >
                {result.correct ? "پاسخ درست بود 🎉" : "پاسخ نادرست بود"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {result.correct
                  ? `${faNum(result.points)} امتیاز گرفتی`
                  : `${faNum(result.points)} امتیاز از دست دادی — فردا جبران کن`}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                پاسخ درست: گزینه {faNum(result.correctIndex + 1)}
              </p>
            </MiniCard>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-center text-[11px] text-destructive">
              {error}
            </p>
          ) : null}
        </>
      )}

      {/* Learning profile — all values are computed server-side (tests.getMyLearningProfile) */}
      {profile ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniCard className="text-center">
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">
              {faNum(profile.totalPoints)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">امتیاز کل</p>
          </MiniCard>
          <MiniCard className="text-center">
            <p className="text-lg font-black text-teal-600 dark:text-teal-400">
              {faNum(profile.avgPercent)}٪
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">میانگین پاسخ درست</p>
          </MiniCard>
          <MiniCard className="text-center">
            <p className="text-lg font-black text-violet-600 dark:text-violet-400">
              {faNum(profile.testsTaken)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">آزمون دادهشده</p>
          </MiniCard>
        </div>
      ) : null}
    </div>
  );
}

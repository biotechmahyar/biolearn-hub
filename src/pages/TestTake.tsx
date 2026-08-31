import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PublicLayout } from "@/components/site/PublicLayout";
import { faNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router";

interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
  topic: { name: string; accent: string } | null;
}

interface ExamDetail {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number;
  questions: ExamQuestion[];
}

export default function TestTake() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const exam = useApiQuery<ExamDetail>(`/api/exams/${slug}`);
  const { mutate: submitExam } = useApiMutation<any, any>("/api/exams/submit", "POST");

  const questions = useMemo(() => exam?.questions ?? [], [exam]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (exam && secondsLeft === null) {
      setSecondsLeft(exam.durationMinutes * 60);
    }
  }, [exam, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const timeUp = secondsLeft !== null && secondsLeft <= 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSubmit = useCallback(async () => {
    if (!exam || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const attempt = await submitExam({
        examId: exam.id,
        answers: Object.entries(answers).map(([questionId, chosenIndex]) => ({
          questionId,
          chosenIndex,
        })),
      });
      if (attempt?.id) {
        navigate(`/tests/result/${attempt.id}`);
      }
    } catch (e) {
      console.error(e);
      submittedRef.current = false;
      setSubmitting(false);
      const msg = e instanceof Error ? e.message : "خطا در ثبت آزمون";
      if (msg.includes("وارد حساب") || msg.includes("حساب شوید")) {
        toast.error("لطفاً ابتدا وارد حساب خود شوید.");
        navigate(`/auth?returnTo=${encodeURIComponent(`/tests/${slug}`)}`);
      } else {
        toast.error(msg);
      }
    }
  }, [exam, answers, submitExam, navigate, slug]);

  useEffect(() => {
    if (timeUp && !submitting) {
      handleSubmit();
    }
  }, [timeUp, submitting, handleSubmit]);

  if (exam === undefined) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          در حال بارگذاری آزمون...
        </div>
      </PublicLayout>
    );
  }
  if (!exam) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          آزمون پیدا نشد.
        </div>
      </PublicLayout>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const q = questions[current];
  const mm = Math.floor((secondsLeft ?? 0) / 60);
  const ss = (secondsLeft ?? 0) % 60;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">{exam.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {faNum(answeredCount)} از {faNum(questions.length)} پاسخ داده شده
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold",
              timeUp
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-card",
            )}
          >
            <Timer className="size-4" />
            <span dir="ltr">
              {faNum(mm)}:{faNum(String(ss).padStart(2, "0"))}
            </span>
          </div>
        </div>

        <Progress
          value={(answeredCount / Math.max(1, questions.length)) * 100}
          className="mt-5 h-1.5"
        />

        {/* Question card */}
        {q && (
          <div className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn("rounded-full ring-1", (q.topic as any)?.accent ? "" : "")}>
                {q.topic?.name}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                سؤال {faNum(current + 1)} از {faNum(questions.length)}
              </Badge>
            </div>
            <p className="mt-5 text-base font-bold leading-8 sm:text-lg">{q.text}</p>

            <div className="mt-6 space-y-2.5">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-right text-sm leading-6 transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border bg-background hover:border-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {faNum(i + 1)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            {timeUp && (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                <AlertTriangle className="size-4" />
                زمان آزمون تمام شد؛ پاسخ‌ها به‌صورت خودکار ثبت می‌شوند.
              </div>
            )}
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            <ChevronRight className="ml-2 size-4" />
            قبلی
          </Button>
          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent((c) => c + 1)}>
              بعدی
              <ChevronLeft className="mr-2 size-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? <Loader2 className="ml-2 size-4 animate-spin" /> : "پایان و ثبت پاسخ‌ها"}
            </Button>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

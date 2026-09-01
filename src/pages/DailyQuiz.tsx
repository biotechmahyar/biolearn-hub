import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { accent, faNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Loader2, Trophy, XCircle, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

export default function DailyQuiz() {
  const quiz = useQuery(api.tests.getDailyQuiz);
  const profile = useQuery(api.tests.getMyLearningProfile);
  const answer = useMutation(api.tests.answerDailyQuiz);

  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; correctIndex: number; points: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (!quiz || result) return;
    setChosen(index);
    setLoading(true);
    setError(null);
    try {
      const res = await answer({ questionId: quiz.question._id, chosenIndex: index });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت پاسخ");
      setChosen(null);
    } finally {
      setLoading(false);
    }
  };

  if (quiz === undefined) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          در حال بارگذاری کوئیز امروز...
        </div>
      </PublicLayout>
    );
  }
  if (!quiz) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-bold">کوئیز امروز هنوز منتشر نشده است</p>
          <p className="text-sm text-muted-foreground">هر روز ساعت ۰:۰۰ کوئیز جدید منتشر می‌شود.</p>
        </div>
      </PublicLayout>
    );
  }

  const q = quiz.question;
  const answered = !!result;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Zap className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">کوئیز روزانه</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            هر روز یک تست از علوم زیستی با پاسخ تشریحی. عادتی کوچک که نتیجه‌اش
            بزرگ است.
          </p>
          {profile && profile.totalPoints > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
              <Trophy className="size-4" />
              {faNum(profile.totalPoints)} امتیاز جمع‌شده
            </div>
          )}
        </div>

        <Card className="mt-8 border-border/70 shadow-lg shadow-primary/5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn("rounded-full ring-1", accent(q.topic?.accent).chip)}>
                {q.topic?.name}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {faNum(quiz.points)} امتیاز
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {quiz.date}
              </Badge>
            </div>

            <p className="mt-5 text-base font-bold leading-8 sm:text-lg">{q.text}</p>

            <div className="mt-6 space-y-2.5">
              {q.options.map((opt, i) => {
                const isCorrect = result ? i === result.correctIndex : false;
                const isChosen = chosen === i;
                const showState = result !== null;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={answered || loading}
                    onClick={() => handleAnswer(i)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-right text-sm leading-6 transition-all",
                      !showState &&
                        (isChosen
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border bg-background hover:border-primary/40"),
                      showState && isCorrect && "border-emerald-500 bg-emerald-50",
                      showState && isChosen && !isCorrect && "border-red-400 bg-red-50",
                      showState && !isChosen && !isCorrect && "border-border bg-background opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                        showState && isCorrect
                          ? "bg-emerald-500 text-white"
                          : showState && isChosen && !isCorrect
                            ? "bg-red-500 text-white"
                            : isChosen
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {showState && isCorrect ? (
                        <CheckCircle2 className="size-4" />
                      ) : showState && isChosen && !isCorrect ? (
                        <XCircle className="size-4" />
                      ) : (
                        faNum(i + 1)
                      )}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            {loading && (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                در حال ثبت پاسخ...
              </p>
            )}
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            {answered && (
              <div
                className={cn(
                  "mt-6 rounded-2xl p-5",
                  result!.correct ? "bg-emerald-50" : "bg-red-50",
                )}
              >
                <p className={cn("text-sm font-extrabold", result!.correct ? "text-emerald-800" : "text-red-700")}>
                  {result!.correct
                    ? `آفرین! پاسخ درست بود (+${faNum(result!.points)} امتیاز)`
                    : "اشکالی ندارد؛ پاسخ تشریحی را بخوان و یاد بگیر"}
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground/85">{q.explanation}</p>
              </div>
            )}

            {answered && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/tests">آزمون تعیین سطح کامل</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link to="/free-content">محتوای رایگان</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

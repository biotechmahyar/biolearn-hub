import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { faNum, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { CheckCircle2, ChevronLeft, RotateCcw, XCircle } from "lucide-react";
import { Link, useParams } from "react-router";

export default function TestResult() {
  const { attemptId = "" } = useParams();
  const attempt = useQuery(api.tests.getAttempt, { attemptId: attemptId as any });

  if (attempt === undefined) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          در حال بارگذاری نتیجه...
        </div>
      </PublicLayout>
    );
  }
  if (!attempt) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          نتیجه پیدا نشد یا به آن دسترسی نداری.
        </div>
      </PublicLayout>
    );
  }

  const ring = (percent: number) => {
    const r = 42;
    const c = 2 * Math.PI * r;
    const off = c - (percent / 100) * c;
    return { r, c, off };
  };
  const { r, c, off } = ring(attempt.percent);
  const weakTopics = attempt.topicBreakdown.filter((t) => t.percent < 40);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/tests" className="hover:text-foreground">آزمون‌ها</Link>
          <ChevronLeft className="size-3.5" />
          <span className="text-foreground">نتیجهٔ آزمون</span>
        </nav>

        {/* Score card */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="grid gap-8 p-8 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="relative mx-auto size-32">
              <svg viewBox="0 0 100 100" className="size-32 -rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={off}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black">{faNum(attempt.percent)}٪</span>
                <span className="text-xs text-muted-foreground">درصد</span>
              </div>
            </div>

            <div>
              <h1 className="text-xl font-extrabold sm:text-2xl">{attempt.exam?.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                ثبت‌شده در {formatDateTime(attempt.finishedAt)}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl bg-muted/60 p-4 text-center">
                  <p className="text-lg font-extrabold">{faNum(attempt.score)}</p>
                  <p className="text-xs text-muted-foreground">پاسخ صحیح</p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-4 text-center">
                  <p className="text-lg font-extrabold">{faNum(attempt.total - attempt.score)}</p>
                  <p className="text-xs text-muted-foreground">پاسخ غلط</p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-4 text-center">
                  <p className="text-lg font-extrabold">{faNum(attempt.total)}</p>
                  <p className="text-xs text-muted-foreground">کل سؤالات</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                  <p className="text-lg font-extrabold text-emerald-700">
                    {attempt.percent >= 70 ? "قوی" : attempt.percent >= 40 ? "متوسط" : "نیازمند تمرین"}
                  </p>
                  <p className="text-xs text-emerald-700/70">سطح کلی</p>
                </div>
              </div>
              <Button asChild variant="outline" className="mt-6 rounded-full">
                <Link to={attempt.exam ? `/tests/${attempt.exam.slug}` : "/tests"}>
                  <RotateCcw className="ml-2 size-4" />
                  آزمون مجدد
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Topic breakdown */}
        <div className="mt-8">
          <h2 className="text-lg font-extrabold">تحلیل عملکرد موضوعی</h2>
          <Card className="mt-4 border-border/70 shadow-sm">
            <CardContent className="space-y-5 p-6">
              {attempt.topicBreakdown.map((t) => {
                const level =
                  t.percent >= 70 ? "strong" : t.percent >= 40 ? "medium" : "weak";
                return (
                  <div key={t.topicId}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        {level === "weak" && <span className="size-2 rounded-full bg-red-500" />}
                        {level === "medium" && <span className="size-2 rounded-full bg-amber-500" />}
                        {level === "strong" && <span className="size-2 rounded-full bg-emerald-500" />}
                        {t.topicName}
                      </span>
                      <span className="text-muted-foreground">
                        {faNum(t.correct)}/{faNum(t.total)} · {faNum(t.percent)}٪
                      </span>
                    </div>
                    <Progress
                      value={t.percent}
                      className={cn(
                        "h-2",
                        level === "weak" && "[&>div]:bg-red-500",
                        level === "medium" && "[&>div]:bg-amber-500",
                        level === "strong" && "[&>div]:bg-emerald-500",
                      )}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {weakTopics.length > 0 && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div>
                <p className="text-sm font-bold text-amber-800">نقاط ضعف پیشنهادی برای تمرین</p>
                <p className="mt-1 text-sm leading-6 text-amber-800/80">
                  روی این مباحث بیشتر وقت بگذار:{" "}
                  {weakTopics.map((t) => t.topicName).join("، ")}. پیشنهاد ما: مرور
                  جزوه + حل ۲۰ تست از هر مبحث + استفاده از فلش‌کارت‌ها.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Review */}
        <div className="mt-8">
          <h2 className="text-lg font-extrabold">مرور پاسخ‌ها</h2>
          <div className="mt-4 space-y-4">
            {(attempt.questions as any[]).map((q, i) => {
              const correct = q.chosenIndex === q.correctIndex;
              return (
                <Card key={q._id} className="border-border/70 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      {correct ? (
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-6">
                          {faNum(i + 1)}. {q.text}
                        </p>
                        <div className="mt-3 space-y-1.5 text-sm">
                          {q.options.map((opt: string, oi: number) => {
                            const isCorrectOpt = oi === q.correctIndex;
                            const isChosen = oi === q.chosenIndex;
                            return (
                              <div
                                key={oi}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg px-3 py-2",
                                  isCorrectOpt && "bg-emerald-50 text-emerald-800",
                                  isChosen && !isCorrectOpt && "bg-red-50 text-red-700",
                                  !isCorrectOpt && !isChosen && "text-muted-foreground",
                                )}
                              >
                                <span className="text-xs font-bold">
                                  {faNum(oi + 1)})
                                </span>
                                {opt}
                                {isCorrectOpt && <span className="mr-auto text-xs font-bold">پاسخ صحیح</span>}
                                {isChosen && !isCorrectOpt && <span className="mr-auto text-xs font-bold">انتخاب تو</span>}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 rounded-xl bg-primary/5 p-4">
                          <p className="text-xs font-bold text-primary">پاسخ تشریحی</p>
                          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

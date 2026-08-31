import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PublicLayout } from "@/components/site/PublicLayout";
import { requestNotificationPermission } from "@/components/site/NotificationCenter";
import { faNum, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiQuery, useApiMutation } from "@/hooks/use-api";
import {
  BellRing,
  CheckCircle2,
  ChevronLeft,
  Flag,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

interface AttemptQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number;
  explanation: string;
  topicId: string;
}

interface TopicBreakdown {
  topicId: string;
  topicName: string;
  correct: number;
  total: number;
  percent: number;
}

interface AttemptDetail {
  id: string;
  examId: string;
  score: number;
  total: number;
  percent: number;
  finishedAt: string;
  exam: { title: string; slug: string } | null;
  questions: AttemptQuestion[];
  topicBreakdown: TopicBreakdown[];
}

export default function TestResult() {
  const { attemptId = "" } = useParams();
  const attempt = useApiQuery<AttemptDetail>(`/api/exams/attempts/${attemptId}`);
  const { mutate: armNextExam } = useApiMutation<any, any>("/api/notifications/reminders/arm-next-exam", "POST");
  const [reminderState, setReminderState] = useState<"idle" | "busy" | "armed">("idle");
  const { mutate: reportExam } = useApiMutation<any, any>("/api/exams/reports", "POST");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportQuestionId, setReportQuestionId] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const handleRemindNext = async () => {
    setReminderState("busy");
    try {
      const granted = await requestNotificationPermission();
      const res = await armNextExam({});
      if (res.ok) {
        setReminderState("armed");
        toast.success(
          granted
            ? "فعال شد 🔔 — وقتی آزمون بعدی منتشر شد، دو بار به شما نوتیف می‌دهیم."
            : "فعال شد 🔔 — یادآوری داخل سایت نمایش داده می‌شود.",
        );
      }
    } catch {
      toast.error("خطا در فعال‌سازی یادآوری");
    } finally {
      setReminderState("idle");
    }
  };


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

  const handleReport = async () => {
    if (!reportQuestionId || !reportComment.trim()) {
      toast.error("سؤال را انتخاب کنید و توضیح گزارش را بنویسید.");
      return;
    }
    setReportBusy(true);
    try {
      const res = await reportExam({
        examId: attempt.examId,
        questionId: reportQuestionId,
        comment: reportComment.trim(),
      });
      toast.success(
        res.duplicate
          ? "این سؤال قبلاً توسط شما گزارش شده و در حال بررسی است."
          : "گزارش شما ثبت شد — تیم آموزشی بررسی می‌کند.",
      );
      setReportOpen(false);
      setReportQuestionId("");
      setReportComment("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ثبت گزارش");
    } finally {
      setReportBusy(false);
    }
  };

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

        {/* Next exam reminder */}
        <Card className="mt-6 border-primary/30 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
              <BellRing className="size-6 text-primary" />
            </span>
            <div className="flex-1">
              <p className="font-bold">یادآوری آزمون بعدی</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                به محض اینکه آزمون جدیدی منتشر شود، دو بار یادآوری می‌کنیم که فقط
                ۲۴ ساعت فرصت داری در آن شرکت کنی. (برای نوتیف گوشی/لپ‌تاپ اجازهٔ
                نمایش نوتیف مرورگر لازم است.)
              </p>
            </div>
            <Button
              className="shrink-0 rounded-full"
              onClick={handleRemindNext}
              disabled={reminderState === "busy" || reminderState === "armed"}
            >
              {reminderState === "busy" ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <BellRing className="ml-2 size-4" />
              )}
              {reminderState === "armed" ? "فعال شد ✓" : "یادآوری کن"}
            </Button>
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
                <Card key={q.id} className="border-border/70 shadow-sm">
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

        {/* Report a question error */}
        <Card className="mt-8 border-amber-300/40 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                  <Flag className="size-5 text-amber-600 dark:text-amber-400" />
                </span>
                <div>
                  <p className="font-bold">گزارش خطای سؤال</p>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                    اگر فکر می‌کنید سؤالی غلط طرح شده — پاسخ صحیح اشتباه است، ابهام دارد یا
                    گزینه‌ای ناقص است — آن را انتخاب کنید و توضیح بدهید. تیم آموزشی بررسی می‌کند
                    و در صورت تأیید، پاسخ‌دهی مجدد انجام می‌شود.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setReportOpen(!reportOpen)}>
                {reportOpen ? "بستن" : "گزارش خطا"}
              </Button>
            </div>

            {reportOpen && (
              <div className="mt-5 space-y-3">
                <Select value={reportQuestionId} onValueChange={setReportQuestionId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="سؤال موردنظر را انتخاب کنید…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(attempt.questions as any[]).map((q, i) => (
                      <SelectItem key={q.id} value={q.id}>
                        {faNum(i + 1)}. {q.text.length > 70 ? `${q.text.slice(0, 70)}…` : q.text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  rows={3}
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="مثلاً: گزینهٔ ۲ نیز صحیح است؛ پاسخ تشریحی با متن سؤال هم‌خوانی ندارد…"
                />
                <div className="flex justify-end">
                  <Button onClick={handleReport} disabled={reportBusy} className="rounded-full">
                    {reportBusy ? <Loader2 className="ml-2 size-4 animate-spin" /> : <Flag className="ml-2 size-4" />}
                    ارسال گزارش
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

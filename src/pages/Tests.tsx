import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { accent, faNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { ArrowLeft, ClipboardList, Clock, HelpCircle, Sparkles } from "lucide-react";
import { Link } from "react-router";

export default function Tests() {
  const exams = useQuery(api.tests.listExams, {});

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">سامانهٔ آزمون</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            بسنج، تحلیل کن، بهتر شو
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            آزمون‌های رایگان و طبقه‌بندی‌شده با زمان‌بندی، پاسخ تشریحی و تحلیل
            عملکرد موضوعی. بعد از هر آزمون، نقاط ضعفت دقیق مشخص می‌شود.
          </p>
        </div>

        {/* Diagnostic highlight */}
        {exams?.find((e) => e.diagnostic) && (
          <div className="relative mt-8 overflow-hidden rounded-3xl bg-gradient-to-l from-primary to-emerald-700 p-7 text-white sm:p-9">
            <div className="absolute inset-0 bg-lab-grid opacity-20" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Sparkles className="size-6" />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold">آزمون تعیین سطح علوم زیستی</h2>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-white/80">
                    ده سؤال از مباحث اصلی؛ نتیجه با درصد موضوعی و پیشنهاد مسیر
                    یادگیری نمایش داده می‌شود. بهترین نقطهٔ شروع برای دانشجویان.
                  </p>
                </div>
              </div>
              {(() => {
                const diag = exams.find((e) => e.diagnostic);
                return (
                  <Button asChild size="lg" className="h-11 shrink-0 rounded-full bg-white px-6 text-primary hover:bg-white/90">
                    <Link to={`/tests/${diag!.slug}`}>
                      شروع آزمون
                      <ArrowLeft className="mr-2 size-4" />
                    </Link>
                  </Button>
                );
              })()}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(exams ?? []).map((exam) => {
            const a = accent(exam.accent);
            return (
              <Card key={exam._id} className="border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={cn("rounded-full ring-1", a.chip)}>
                      {exam.diagnostic ? "تعیین سطح" : "آزمون موضوعی"}
                    </Badge>
                    {exam.free && (
                      <Badge className="border-0 bg-emerald-500/10 text-emerald-700">رایگان</Badge>
                    )}
                  </div>
                  <h3 className="mt-3 text-[15px] font-bold leading-6">{exam.title}</h3>
                  <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
                    {exam.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="size-3.5" />
                      {faNum(exam.questionCount)} سؤال
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {faNum(exam.durationMinutes)} دقیقه
                    </span>
                  </div>
                  <Button asChild variant="outline" className="mt-5 w-full rounded-full">
                    <Link to={`/tests/${exam.slug}`}>
                      <ClipboardList className="ml-2 size-4" />
                      شروع آزمون
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
          آزمون‌های بیشتر (تشریحی، فصل‌به‌فصل و آزمون‌های جامع) در فازهای بعدی اضافه می‌شوند.
        </div>
      </div>
    </PublicLayout>
  );
}

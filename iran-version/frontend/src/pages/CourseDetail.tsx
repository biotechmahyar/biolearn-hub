import { Link, useParams } from "react-router";
import { useApi } from "@/hooks/use-api";
import { accent, faNum, formatPrice, BUNDLE_LABELS, MODE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Clock, Star, Users, CheckCircle2 } from "lucide-react";

export default function CourseDetail() {
  const { slug = "" } = useParams();
  const course = useApi<any>(slug ? `/api/content/courses/${slug}` : null);

  if (course === undefined) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">در حال بارگذاری...</div>;
  }
  if (!course) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-bold">دوره پیدا نشد</p>
        <Button asChild variant="outline"><Link to="/courses">بازگشت</Link></Button>
      </div>
    );
  }

  const a = accent(course.accent);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">خانه</Link>
        <ChevronLeft className="size-3.5" />
        <Link to="/courses" className="hover:text-foreground">دوره‌ها</Link>
        <ChevronLeft className="size-3.5" />
        <span className="text-foreground">{course.title}</span>
      </nav>

      {/* Hero */}
      <Card className={cn("border-border/70 bg-gradient-to-br text-white", a.grad)}>
        <CardContent className="p-8">
          <Badge className="rounded-full bg-white/20 text-white">{course.category?.name}</Badge>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{course.title}</h1>
          <p className="mt-3 text-sm leading-7 text-white/80">{course.summary}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="flex items-center gap-1"><Users className="size-3.5" /> {faNum(course.studentsCount || 0)} دانشجو</span>
            <span className="flex items-center gap-1"><Star className="size-3.5" /> {faNum(course.rating || 0)}</span>
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> {course.durationText}</span>
          </div>
        </CardContent>
      </Card>

      {/* Price & CTA */}
      <Card className="mt-6 border-border/70">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-2xl font-extrabold text-primary">{formatPrice(course.discountPrice || course.price)}</p>
            {course.discountPrice && (
              <p className="text-xs text-muted-foreground line-through">{formatPrice(course.price)}</p>
            )}
          </div>
          <Button size="lg" className="rounded-full">ثبت‌نام در دوره</Button>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="mt-8 space-y-8">
        {/* Description */}
        <div>
          <h2 className="text-xl font-extrabold">درباره دوره</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground whitespace-pre-wrap">{course.description}</p>
        </div>

        {/* Syllabus */}
        {course.syllabus && course.syllabus.length > 0 && (
          <div>
            <h2 className="text-xl font-extrabold">سرفصل‌های دوره</h2>
            <div className="mt-4 space-y-2">
              {course.syllabus.map((lesson: any, i: number) => (
                <div key={lesson.id || i} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {faNum(i + 1)}
                  </span>
                  <span className="flex-1 text-sm font-medium">{lesson.title}</span>
                  <span className="text-xs text-muted-foreground">{faNum(lesson.durationMin)} دقیقه</span>
                  {lesson.free && <Badge className="rounded-full bg-emerald-50 text-emerald-700">رایگان</Badge>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audience */}
        {course.audience && course.audience.length > 0 && (
          <div>
            <h2 className="text-xl font-extrabold">مناسب چه کسانی است؟</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {course.audience.map((item: string) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructor */}
        {course.instructor && (
          <Card className="border-border/70">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {course.instructor.name?.[0]}
              </div>
              <div>
                <p className="font-bold">{course.instructor.name}</p>
                <p className="text-xs text-muted-foreground">مدرس دوره</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

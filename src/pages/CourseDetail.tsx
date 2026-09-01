import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckoutDialog } from "@/components/site/CheckoutDialog";
import { InstructorAvatar } from "@/components/site/InstructorAvatar";
import { PublicLayout } from "@/components/site/PublicLayout";
import { iconFor } from "@/components/site/icons";
import { api } from "@/convex/_generated/api";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { accent, BUNDLE_LABELS, faNum, formatDate, formatPrice, MODE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  Film,
  GraduationCap,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

const FAQ = [
  {
    q: "دسترسی به دوره چقدر باقی می‌ماند؟",
    a: "دوره‌های ضبط‌شده دسترسی مادام‌العمر دارند. در دوره‌های ترکیبی، جلسات زنده در زمان مقرر برگزار می‌شوند و ضبط آن‌ها همیشه در دسترس است.",
  },
  {
    q: "اگر از دوره راضی نبودم چه؟",
    a: "تا ۷ روز پس از خرید، اگر کمتر از ۲۰٪ دوره را مشاهده کرده باشید، مبلغ بازگشت داده می‌شود. جزئیات در صفحهٔ قوانین آمده است.",
  },
  {
    q: "جزوه و فایل‌ها را چطور دریافت کنم؟",
    a: "بعد از ثبت‌نام، فایل‌های دوره در پنل دانشجویی → بخش دانلودها در دسترس است.",
  },
  {
    q: "آیا دوره شامل جلسهٔ رفع اشکال است؟",
    a: "در پکیج‌های پلاس و پرمیوم بله؛ جلسات رفع اشکال زنده و گروه پشتیبانی در برنامهٔ دوره مشخص شده است.",
  },
];

const BUNDLE_ORDER = ["economy", "basic", "plus", "premium"] as const;

const BUNDLE_DESC: Record<string, string> = {
  economy: "فقط خود دوره",
  basic: "دوره + آزمون",
  plus: "دوره + جزوه + تست",
  premium: "دوره + جزوه + فلش‌کارت + رفع اشکال",
};

export default function CourseDetail() {
  const { slug = "" } = useParams();
  const course = useQuery(api.content.getCourseBySlug, { slug });
  const testimonials = useQuery(api.content.listTestimonials);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const markLesson = useMutation(api.enroll.markLessonComplete);

  if (course === undefined) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          در حال بارگذاری...
        </div>
      </PublicLayout>
    );
  }
  if (!course) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-bold">دوره پیدا نشد</p>
          <Button asChild variant="outline">
            <Link to="/courses">بازگشت به دوره‌ها</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const a = accent(course.accent);
  const Icon = iconFor(course.category?.icon ?? "");
  const effective = course.discountPrice ?? course.price;
  const hasDiscount = !!course.discountPrice && course.discountPrice < course.price;
  const isEnrolled = !!course.enrollment;
  const totalMin = course.syllabus.reduce((acc, l) => acc + l.durationMin, 0);
  const completedCount = course.enrollment?.completedLessons.length ?? 0;
  const percent = course.syllabus.length === 0 ? 0 : Math.round((completedCount / course.syllabus.length) * 100);

  const toggleLesson = async (lessonId: string, completed: boolean) => {
    await markLesson({ courseId: course._id, lessonId, completed });
  };

  const courseReviews = (testimonials ?? []).filter((t) => t.course === course.title);

  const openCheckout = (tier: string) => {
    setBuying(tier);
    setCheckoutOpen(true);
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={cn("relative overflow-hidden bg-gradient-to-br text-white", a.grad)}>
        <div className="absolute inset-0 bg-lab-grid opacity-20" />
        <div className="absolute -left-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <nav className="mb-6 flex items-center gap-1.5 text-xs text-white/70">
            <Link to="/" className="hover:text-white">خانه</Link>
            <ChevronLeft className="size-3.5" />
            <Link to="/courses" className="hover:text-white">دوره‌ها</Link>
            <ChevronLeft className="size-3.5" />
            <span className="text-white">{course.title}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-white/15 backdrop-blur">{MODE_LABELS[course.mode]}</Badge>
                <Badge className="border-0 bg-white/15 backdrop-blur">
                  {course.category?.name}
                </Badge>
                <Badge className="border-0 bg-white/15 backdrop-blur">
                  پکیج {BUNDLE_LABELS[course.bundle]}
                </Badge>
                {course.price === 0 && (
                  <Badge className="border-0 bg-emerald-400/90 text-emerald-950">رایگان</Badge>
                )}
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl text-balance">
                {course.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 sm:text-[15px]">
                {course.summary}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/85">
                <span className="flex items-center gap-1.5">
                  <Star className="size-4 fill-amber-300 text-amber-300" />
                  <b>{faNum(course.rating)}</b>
                  <span className="text-white/70">({faNum(course.ratingCount)} نظر)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4" />
                  {faNum(course.studentsCount)} دانشجو
                </span>
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="size-4" />
                  {faNum(course.syllabus.length)} جلسه
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {faNum(Math.round(totalMin / 60))} ساعت محتوا
                </span>
                <span className="flex items-center gap-1.5">
                  <Film className="size-4" />
                  {course.durationText}
                </span>
              </div>

              {course.instructor && (
                <Link
                  to={`/instructors/${course.instructor.slug}`}
                  className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/10 p-3 pr-4 backdrop-blur transition-colors hover:bg-white/15"
                >
                  <InstructorAvatar name={course.instructor.name} accent={course.accent} className="size-10 text-xs" />
                  <span>
                    <span className="block text-sm font-bold">{course.instructor.name}</span>
                    <span className="block text-xs text-white/70">{course.instructor.title}</span>
                  </span>
                </Link>
              )}
            </div>

            {/* Buy card */}
            <Card className="border-0 bg-card/95 text-card-foreground shadow-2xl backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-end justify-between">
                  <div>
                    {course.price === 0 ? (
                      <span className="text-2xl font-black text-emerald-600">رایگان</span>
                    ) : (
                      <>
                        <span className="text-2xl font-black">{formatPrice(effective)}</span>
                        {hasDiscount && (
                          <span className="mr-2 text-sm text-muted-foreground line-through">
                            {faNum(course.price)}
                          </span>
                        )}
                      </>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {course.price === 0 ? "ثبت‌نام بدون پرداخت" : "پرداخت امن · فاکتور رسمی"}
                    </p>
                  </div>
                  {course.hasSampleVideo && (
                    <Badge variant="secondary" className="rounded-full">نمونه ویدیو</Badge>
                  )}
                </div>

                {isEnrolled ? (
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">پیشرفت دوره</span>
                      <span className="text-primary">{faNum(percent)}٪</span>
                    </div>
                    <Progress value={percent} className="h-2" />
                    <Button asChild className="w-full">
                      <Link to={`/courses/${course.slug}#syllabus`}>
                        <PlayCircle className="ml-2 size-4" />
                        {percent === 100 ? "مرور دوباره دوره" : "ادامه یادگیری"}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-2.5">
                    {BUNDLE_ORDER.map((tier) => {
                      const isSelected = buying === tier;
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => openCheckout(tier)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-right transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border bg-background hover:border-primary/40",
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <CheckCircle2 className="size-4" />
                            </span>
                            <span>
                              <span className="block text-sm font-bold">پکیج {BUNDLE_LABELS[tier]}</span>
                              <span className="block text-xs text-muted-foreground">
                                {BUNDLE_DESC[tier]}
                              </span>
                            </span>
                          </span>
                          <ChevronLeft className="size-4 text-muted-foreground" />
                        </button>
                      );
                    })}
                    <Button className="w-full" size="lg" onClick={() => openCheckout("premium")}>
                      {course.price === 0 ? "ثبت‌نام رایگان" : `خرید دوره — ${formatPrice(effective)}`}
                    </Button>
                    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                      <ShieldCheck className="size-3.5 text-emerald-500" />
                      بازگشت وجه تا ۷ روز · دسترسی فوری
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-10">
            {/* About */}
            <div>
              <h2 className="text-xl font-extrabold">دربارهٔ دوره</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-[15px]">
                {course.description}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <Users className="size-4 text-primary" />
                    مناسب چه کسانی است؟
                  </h3>
                  <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                    {course.audience.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <GraduationCap className="size-4 text-primary" />
                    پیش‌نیازها
                  </h3>
                  <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                    {course.prerequisites.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Syllabus */}
            <div id="syllabus" className="scroll-mt-24">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold">سرفصل‌های دوره</h2>
                {isEnrolled && (
                  <span className="text-sm text-muted-foreground">
                    {faNum(completedCount)} از {faNum(course.syllabus.length)} جلسه تکمیل شده
                  </span>
                )}
              </div>
              <Accordion type="single" collapsible className="mt-4 space-y-2">
                {course.syllabus.map((lesson, index) => {
                  const done = course.enrollment?.completedLessons.includes(lesson.id) ?? false;
                  return (
                    <AccordionItem
                      key={lesson.id}
                      value={lesson.id}
                      className="rounded-xl border border-border/70 bg-card/60 px-4"
                    >
                      <AccordionTrigger className="py-3.5 hover:no-underline">
                        <span className="flex items-center gap-3 text-right">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                            {faNum(index + 1)}
                          </span>
                          <span className={cn("text-sm font-semibold", done && "text-muted-foreground line-through")}>
                            {lesson.title}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-wrap items-center gap-3 pb-4">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3.5" />
                            {faNum(lesson.durationMin)} دقیقه
                          </span>
                          {lesson.free ? (
                            <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700">
                              رایگان
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full">ویژهٔ دوره</Badge>
                          )}
                          {isEnrolled && (
                            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                              <Checkbox
                                checked={done}
                                onCheckedChange={(v) => toggleLesson(lesson.id, !!v)}
                              />
                              {done ? "تکمیل شد" : "علامت‌گذاری به‌عنوان دیده‌شده"}
                            </label>
                          )}
                          {!isEnrolled && (
                            <span className="text-xs text-muted-foreground">
                              برای دسترسی به جلسات، در دوره ثبت‌نام کن.
                            </span>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>

            {/* Includes */}
            <div>
              <h2 className="text-xl font-extrabold">این پکیج شامل چه چیزهایی است؟</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {course.includes.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card/60 px-4 py-3">
                    <ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-sm leading-6">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Files */}
            {course.files.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold">
                  <FileText className="size-5 text-primary" />
                  فایل‌های دوره
                </h2>
                <div className="mt-4 space-y-2">
                  {course.files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 px-4 py-3"
                    >
                      <span className="flex items-center gap-3 text-sm font-medium">
                        <Download className="size-4 text-muted-foreground" />
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{file.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructor */}
            {course.instructor && (
              <div>
                <h2 className="text-xl font-extrabold">مدرس دوره</h2>
                <Link
                  to={`/instructors/${course.instructor.slug}`}
                  className="mt-4 flex items-start gap-4 rounded-2xl border border-border/70 bg-card/60 p-5 transition-colors hover:border-primary/30"
                >
                  <InstructorAvatar name={course.instructor.name} accent={course.accent} className="size-14 text-sm" />
                  <div>
                    <p className="text-[15px] font-bold">{course.instructor.name}</p>
                    <p className="text-xs text-muted-foreground">{course.instructor.title}</p>
                  </div>
                </Link>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="text-xl font-extrabold">نظرات دانشجویان</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(courseReviews.length > 0 ? courseReviews : testimonials ?? []).slice(0, 4).map((t) => (
                  <div key={t._id} className="rounded-2xl border border-border/70 bg-card/60 p-5">
                    <div className="flex gap-0.5 text-amber-400">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-foreground/90">«{t.text}»</p>
                    <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-3">
                      <InstructorAvatar name={t.name} accent={t.accent} className="size-8 text-[11px]" />
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="text-xl font-extrabold">سؤالات پرتکرار</h2>
              <Accordion type="single" collapsible className="mt-4 space-y-2">
                {FAQ.map((f) => (
                  <AccordionItem key={f.q} value={f.q} className="rounded-xl border border-border/70 bg-card/60 px-4">
                    <AccordionTrigger className="py-3.5 text-sm font-bold hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-7 text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-border/70 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <h3 className="text-sm font-bold">خلاصهٔ دوره</h3>
                <ul className="space-y-2.5 text-[13px] text-muted-foreground">
                  <li className="flex justify-between">
                    <span>نوع دوره</span>
                    <span className="font-medium text-foreground">{MODE_LABELS[course.mode]}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>تعداد جلسات</span>
                    <span className="font-medium text-foreground">{faNum(course.syllabus.length)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>مدت دوره</span>
                    <span className="font-medium text-foreground">{course.durationText}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>سطح</span>
                    <span className="font-medium text-foreground">پکیج {BUNDLE_LABELS[course.bundle]}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>دسته</span>
                    <span className="font-medium text-foreground">{course.category?.name}</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (isEnrolled) return;
                    openCheckout(course.bundle);
                  }}
                >
                  {isEnrolled ? "ثبت‌نام شده ✓" : `خرید پکیج ${BUNDLE_LABELS[course.bundle]}`}
                </Button>
              </CardContent>
            </Card>

            <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
              <h3 className="text-sm font-bold">بعد از خرید</h3>
              <ul className="mt-3 space-y-2.5 text-[13px] text-muted-foreground">
                {["دسترسی فوری به همهٔ جلسات", "جزوه و فایل‌ها در پنل دانلودها", "پیشرفت شما در پنل دانشجویی ذخیره می‌شود", "پشتیبانی و رفع اشکال"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Bookmark className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Group discount CTA */}
      {course.price > 0 && !isEnrolled && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-extrabold">تخفیف گروهی</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  با دوستان هم‌رشته‌ای‌ات ثبت‌نام کن و هزینهٔ کمتری بپرداز.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {[
                    { count: 2, percent: 10 },
                    { count: 3, percent: 15 },
                    { count: 4, percent: 20 },
                  ].map((g) => (
                    <span
                      key={g.count}
                      className="rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-bold"
                    >
                      {faNum(g.count)} نفر: {faNum(g.percent)}٪ تخفیف
                    </span>
                  ))}
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/auth?returnTo=%2Fdashboard">
                  <Users className="ml-2 size-4" />
                  ثبت‌نام گروهی
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        bundleTier={buying ?? course.bundle}
        items={[
          {
            type: "course",
            refId: course._id,
            title: course.title,
            price: effective,
          },
        ]}
        successTitle="ثبت‌نام با موفقیت انجام شد"
        successDescription="دسترسی تو به دوره فعال شد. می‌توانی از همین‌جا شروع به یادگیری کنی."
      />
    </PublicLayout>
  );
}

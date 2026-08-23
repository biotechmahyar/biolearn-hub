import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArticleCard } from "@/components/site/ArticleCard";
import { CourseCard } from "@/components/site/CourseCard";
import { InstructorAvatar } from "@/components/site/InstructorAvatar";
import { ProductCard } from "@/components/site/ProductCard";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SectionHeading } from "@/components/site/SectionHeading";
import { iconFor } from "@/components/site/icons";
import { api } from "@/convex/_generated/api";
import { accent, faNum, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpLeft,
  Award,
  BarChart3,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Dna,
  FileText,
  GraduationCap,
  HeartHandshake,
  Layers,
  LineChart,
  MessageCircle,
  Microscope,
  PlayCircle,
  Send,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { SeedBootstrap } from "@/components/site/SeedBootstrap";

export default function Landing() {
  const categories = useQuery(api.content.listCategories);
  const popularCourses = useQuery(api.content.listCourses, { popularOnly: true, limit: 4 });
  const featuredCourses = useQuery(api.content.listCourses, { featuredOnly: true, limit: 4 });
  const products = useQuery(api.content.listProducts, { featuredOnly: true });
  const articles = useQuery(api.content.listArticles, { limit: 3 });
  const instructors = useQuery(api.content.listInstructors);
  const testimonials = useQuery(api.content.listTestimonials);
  const dailyQuiz = useQuery(api.tests.getDailyQuiz);
  const exams = useQuery(api.tests.listExams, { featuredOnly: true, freeOnly: true });

  const heroCourses = popularCourses ?? featuredCourses ?? [];

  return (
    <PublicLayout>
      <SeedBootstrap />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-lab-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-24">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-5 rounded-full px-3 py-1.5 text-[13px] font-medium">
                <span className="ml-1.5 inline-flex size-2 rounded-full bg-emerald-500" />
                پلتفرم تخصصی علوم زیستی — ساخته‌شده توسط دانشجویان
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-4xl font-black leading-[1.2] tracking-tight sm:text-5xl lg:text-[3.4rem] text-balance"
            >
              یادگیری عمیق علوم زیستی،
              <span className="mt-1 block bg-gradient-to-l from-primary to-emerald-600 bg-clip-text text-transparent">
                از ترم اول تا امتحان و فراتر از آن
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
            >
              زیست‌آکادمی اکوسیستم آموزشی دانشجویان میکروبیولوژی، بیوتکنولوژی و
              علوم زیستی است: دوره، جزوه، فلش‌کارت، آزمون تعیین سطح، کوئیز
              روزانه و همراهی واقعی — نه فقط فروش کلاس.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button asChild size="lg" className="h-12 rounded-full px-7 text-[15px]">
                <Link to="/courses">
                  مشاهده دوره‌ها
                  <ArrowLeft className="mr-2 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-7 text-[15px]">
                <Link to="/tests">
                  <Microscope className="ml-2 size-4" />
                  آزمون تعیین سطح رایگان
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-5 text-[15px]">
                <Link to="/daily-quiz">
                  <Zap className="ml-2 size-4 text-amber-500" />
                  کوئیز روزانه
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-10 grid max-w-md grid-cols-3 gap-4"
            >
              {[
                ["+۴ هزار", "دانشجوی همراه"],
                ["+۸ دوره", "تخصصی علوم زیستی"],
                ["+۴۰ تست", "بانک سؤال استاندارد"],
              ].map(([num, label]) => (
                <div key={label} className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3 backdrop-blur">
                  <p className="text-lg font-extrabold text-primary">{num}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative hidden lg:block"
          >
            <div className="relative mx-auto aspect-square max-w-md">
              {/* DNA ring */}
              <div className="absolute inset-0 rounded-[2.5rem] border border-border/60 bg-card/60 shadow-xl shadow-primary/5 backdrop-blur" />
              <div className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/10" />

              {/* DNA helix */}
              <svg viewBox="0 0 200 200" className="absolute inset-0 m-auto h-56 w-56" fill="none">
                <path d="M70 30c0 40 60 100 60 140" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
                <path d="M130 30c0 40-60 100-60 140" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
                <path d="M70 55h60M66 90h68M64 125h72M70 160h60" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                <circle cx="70" cy="30" r="5" fill="var(--primary)" />
                <circle cx="130" cy="170" r="5" fill="var(--primary)" />
                <circle cx="130" cy="30" r="4" fill="oklch(0.62 0.13 165)" />
                <circle cx="70" cy="170" r="4" fill="oklch(0.62 0.13 165)" />
              </svg>

              {/* Floating chips */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-4 top-10 flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-lg"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <ClipboardList className="size-4.5" />
                </span>
                <div>
                  <p className="text-xs font-bold">آزمون تعیین سطح</p>
                  <p className="text-[11px] text-muted-foreground">تشخیص نقاط ضعف</p>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-6 top-1/3 flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-lg"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="size-4.5" />
                </span>
                <div>
                  <p className="text-xs font-bold">پیشرفت قابل اندازه‌گیری</p>
                  <p className="text-[11px] text-muted-foreground">میکروب‌شناسی ۷۲٪</p>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 right-8 flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-lg"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Zap className="size-4.5" />
                </span>
                <div>
                  <p className="text-xs font-bold">کوئیز روزانه</p>
                  <p className="text-[11px] text-muted-foreground">یک تست در روز + توضیح</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Learning ecosystem flow ─────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-card/50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="اکوسیستم یادگیری"
            title="مسیری که دانشجو را همراهی می‌کند"
            description="از محتوای رایگان و آزمون تعیین سطح شروع می‌کنی؛ نقاط ضعف مشخص می‌شود، مسیر پیشنهاد می‌شود و هر قدم پیشرفت تو قابل اندازه‌گیری است."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {[
              ["محتوای رایگان", BookOpenCheck],
              ["آشنایی با برند", Sparkles],
              ["عضویت", Users],
              ["آزمون تعیین سطح", ClipboardList],
              ["پیشنهاد مسیر", Target],
              ["دوره و آزمون", GraduationCap],
              ["پیشرفت و مسیر بعدی", TrendingUp],
            ].map(([label, Icon], i) => (
              <motion.div
                key={label as string}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="relative flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-5 text-center"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {(() => {
                    const I = Icon as typeof Users;
                    return <I className="size-5" />;
                  })()}
                </span>
                <span className="text-xs font-semibold leading-4">{label as string}</span>
                {i < 6 && (
                  <ChevronLeft className="absolute -left-3 top-1/2 hidden size-4 -translate-y-1/2 text-muted-foreground/50 lg:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          kicker="دسته‌بندی آموزشی"
          title="هر حوزه‌ای از علوم زیستی، یک مسیر دارد"
          actionLabel="همه دوره‌ها"
          actionTo="/courses"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(categories ?? []).map((cat) => {
            const a = accent(cat.accent);
            const Icon = iconFor(cat.icon);
            return (
              <Link
                key={cat._id}
                to={`/courses?category=${cat.slug}`}
                className={cn(
                  "group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white", a.grad)}>
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{cat.name}</span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-4 text-muted-foreground">
                    {cat.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Popular courses ─────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-card/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="دوره‌های محبوب"
            title="دوره‌هایی که دانشجوها به آن‌ها اعتماد کرده‌اند"
            actionLabel="همه دوره‌ها"
            actionTo="/courses"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(heroCourses ?? []).map((course) => (
              <CourseCard key={course._id} course={course as any} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Diagnostic test CTA ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-primary to-emerald-700 p-8 text-white sm:p-12">
          <div className="absolute inset-0 bg-lab-grid opacity-20" />
          <div className="absolute -left-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge className="mb-4 border-0 bg-white/15 text-white backdrop-blur">
                رایگان · بدون نیاز به ثبت‌نام دوره
              </Badge>
              <h2 className="text-2xl font-extrabold leading-9 sm:text-3xl text-balance">
                نمی‌دانی از کجا شروع کنی؟ از آزمون تعیین سطح شروع کن.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/80 sm:text-[15px]">
                ده سؤال از مباحث اصلی علوم زیستی. نتیجه به‌صورت درصد و تحلیل
                موضوعی (میکروب‌شناسی، ژنتیک، بیوشیمی و...) نشانت داده می‌شود تا
                دقیقاً بدانی روی چه مباحثی تمرکز کنی.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-11 rounded-full bg-white px-6 text-primary hover:bg-white/90">
                  <Link to="/tests">
                    <Microscope className="ml-2 size-4" />
                    شروع آزمون رایگان
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="h-11 rounded-full px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/daily-quiz">
                    <Zap className="ml-2 size-4" />
                    کوئیز امروز
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {(exams ?? []).slice(0, 3).map((exam) => (
                <Link
                  key={exam._id}
                  to={`/tests/${exam.slug}`}
                  className="group flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 backdrop-blur transition-colors hover:bg-white/15"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
                      <ClipboardList className="size-4.5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{exam.title}</span>
                      <span className="block text-xs text-white/70">
                        {faNum(exam.questionCount)} سؤال · {faNum(exam.durationMinutes)} دقیقه
                      </span>
                    </span>
                  </span>
                  <PlayCircle className="size-5 text-white/70 transition-transform group-hover:scale-110" />
                </Link>
              ))}
              {exams && exams.length === 0 && (
                <div className="rounded-2xl bg-white/10 px-5 py-4 text-sm text-white/80">
                  به‌زودی آزمون‌های بیشتری اضافه می‌شود.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Daily quiz ──────────────────────────────────────────────────── */}
      {dailyQuiz && (
        <section className="border-y border-border/60 bg-card/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              kicker="کوئیز روزانه"
              title="هر روز، یک تست با توضیح کامل"
              description="یک عادت مطالعاتی کوچک که تفاوت بزرگی می‌سازد. هر روز یک سؤال جدید، پاسخ تشریحی و امتیاز."
              actionLabel="حل کوئیز امروز"
              actionTo="/daily-quiz"
            />
            <Card className="mx-auto max-w-3xl overflow-hidden border-border/70 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={cn("rounded-full ring-1", accent(dailyQuiz.question.topic?.accent).chip)}>
                        {dailyQuiz.question.topic?.name}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        {faNum(dailyQuiz.points)} امتیاز
                      </Badge>
                    </div>
                    <p className="mt-3 text-base font-bold leading-7 sm:text-lg">
                      {dailyQuiz.question.text}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {dailyQuiz.question.options.slice(0, 2).map((opt, i) => (
                        <span key={i} className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                          {opt}
                        </span>
                      ))}
                      <span className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">...</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-center sm:text-left">
                    <Button asChild className="rounded-full px-6">
                      <Link to="/daily-quiz">
                        {dailyQuiz.myAnswer ? "مشاهده نتیجهٔ امروز" : "پاسخ بده"}
                        <ArrowLeft className="mr-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ── Instructors ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          kicker="مدرس‌ها و تیم"
          title="تیمی از جنس خود دانشجوها"
          description="چهار دانشجوی میکروبیولوژی و یک دانشجوی بیوتکنولوژی + استادان مهمان متخصص — همه با تجربهٔ مستقیم از مسیری که شما طی می‌کنید."
          actionLabel="همه مدرس‌ها"
          actionTo="/instructors"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(instructors ?? []).slice(0, 5).map((ins) => (
            <Link
              key={ins._id}
              to={`/instructors/${ins.slug}`}
              className="group rounded-2xl border border-border/70 bg-card/70 p-5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
            >
              <InstructorAvatar name={ins.name} accent={ins.accent} className="mx-auto size-14 text-sm" />
              <p className="mt-3 text-sm font-bold leading-5 transition-colors group-hover:text-primary">
                {ins.name}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">{ins.title}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Products ────────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-card/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="محصولات آموزشی فیزیکی"
            title="یادگیری که از صفحهٔ نمایش بیرون می‌آید"
            description="فلش‌کارت‌ها، کتابچه‌های جمع‌بندی و پوسترهای آموزشی برای مرور فعال و شب امتحان."
            actionLabel="همه محصولات"
            actionTo="/products"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(products ?? []).map((product) => (
              <ProductCard key={product._id} product={product as any} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Free content ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          kicker="محتوای رایگان"
          title="آموزشی که قبل از خرید می‌توانی امتحانش کنی"
          description="یادداشت‌های علمی، روش‌های مطالعه، نکات امتحانی، گفت‌وگوها و گزارش نشست‌ها — رایگان برای همه."
          actionLabel="همه مطالب"
          actionTo="/free-content"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(articles ?? []).map((article) => (
            <ArticleCard key={article._id} article={article as any} />
          ))}
        </div>
      </section>

      {/* ── Advantages ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <SectionHeading
          kicker="چرا زیست‌آکادمی؟"
          title="نه فقط ویدیو؛ یک سیستم یادگیری کامل"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Target, title: "آزمون و تحلیل عملکرد", desc: "بعد از هر آزمون، درصد موضوعی (میکروب‌شناسی، ژنتیک، بیوشیمی...) و نقاط ضعف را می‌بینی." },
            { icon: Layers, title: "پکیج کامل، نه فقط ویدیو", desc: "هر دوره شامل جزوه، تست، فلش‌کارت، آزمون و جلسهٔ رفع اشکال است." },
            { icon: HeartHandshake, title: "همراهی واقعی", desc: "تیم ما خودش دانشجوی همین رشته‌هاست؛ پشتیبانی و راهنمایی از جنس تجربهٔ مستقیم." },
            { icon: LineChart, title: "پیشرفت قابل اندازه‌گیری", desc: "پروفایل یادگیری شخصی تو ساخته می‌شود و مسیر بعدی بر اساس نقاط قوت و ضعف پیشنهاد می‌شود." },
          ].map((f) => (
            <Card key={f.title} className="border-border/70 bg-card/70 shadow-sm">
              <CardContent className="p-6">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Future teaser ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { icon: Bot, title: "AI Tutor تخصصی", desc: "پاسخ به سؤالات علوم زیستی در سطح دلخواه، مبتنی بر محتوای تأییدشدهٔ پلتفرم — به‌زودی." },
            { icon: Send, title: "ربات تلگرام", desc: "کوئیز روزانه، یادآوری کلاس، اطلاع‌رسانی و دیکشنری در تلگرام — در فاز بعدی." },
            { icon: Sparkles, title: "مسیر یادگیری شخصی", desc: "پیشنهاد خودکار ویدیو، فلش‌کارت و آزمون بر اساس پروفایل یادگیری تو — در حال طراحی." },
          ].map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 rounded-2xl border border-dashed border-border bg-card/40 p-6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <f.icon className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">{f.title}</h3>
                  <Badge variant="outline" className="rounded-full text-[10px]">به‌زودی</Badge>
                </div>
                <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-card/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="نظر دانشجوها"
            title="تجربه‌هایی که واقعاً اتفاق افتاده"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(testimonials ?? []).map((t) => (
              <Card key={t._id} className="border-border/70 bg-background shadow-sm">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-foreground/90">«{t.text}»</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                    <InstructorAvatar name={t.name} accent={t.accent} className="size-9 text-[11px]" />
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Membership CTA ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card to-muted/60 p-8 text-center sm:p-14">
          <div className="absolute inset-0 bg-lab-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
          <div className="relative">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Dna className="size-7" />
            </span>
            <h2 className="mx-auto mt-5 max-w-2xl text-2xl font-extrabold leading-9 sm:text-3xl text-balance">
              عضویت رایگان است؛ یادگیری جدی شروع می‌شود
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              با حساب رایگانت به کوئیز روزانه، آزمون تعیین سطح، محتوای رایگان و
              پروفایل یادگیری شخصی دسترسی پیدا می‌کنی. دوره‌ها و آزمون‌های
              پیشرفته، وقتی آماده‌ای خریداری می‌شوند.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-8 text-[15px]">
                <Link to="/auth?returnTo=%2Fdashboard">
                  عضویت رایگان
                  <ArrowUpLeft className="mr-2 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-8 text-[15px]">
                <Link to="/free-content">
                  <FileText className="ml-2 size-4" />
                  اول محتوای رایگان
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" /> بدون کارت بانکی
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" /> دسترسی فوری
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" /> پشتیبانی واقعی
              </span>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

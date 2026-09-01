import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/site/PublicLayout";
import { SectionHeading } from "@/components/site/SectionHeading";
import { InstructorAvatar } from "@/components/site/InstructorAvatar";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Dna,
  FlaskConical,
  GraduationCap,
  Heart,
  Microscope,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

export default function About() {
  const instructors = useQuery(api.content.listInstructors);

  const teamMembers = (instructors ?? []).filter(
    (i) =>
      i.name === "زهرا احمدی" ||
      i.name === "علی رضایی" ||
      i.name === "مریم کریمی" ||
      i.name === "محمد حسینی" ||
      i.name === "سارا محمدی",
  );

  const values = [
    {
      icon: Microscope,
      title: "تخصصی، نه عمومی",
      desc: "هر محتوا توسط دانشجویان همین رشته‌ها طراحی و بررسی می‌شود. نه محتوای عمومی، بلکه چیزی که واقعاً برای امتحان و درک مفهومی لازم داری.",
    },
    {
      icon: Heart,
      title: "از جنس خودت",
      desc: "تیم Genova خودش دانشجوی همین رشته‌هاست. تجربهٔ شب امتحان، سردرگمی منابع و استرس آزمون را می‌فهمد.",
    },
    {
      icon: Target,
      title: "هدفمند و قابل اندازه‌گیری",
      desc: "با آزمون تعیین سطح شروع می‌کنی، نقاط ضعف مشخص می‌شود و مسیر پیشنهاد می‌شود. پیشرفتت عدد دارد.",
    },
    {
      icon: Zap,
      title: "عادت کوچک، تأثیر بزرگ",
      desc: "کوئیز روزانه، مرور فاصله‌دار و جلسهٔ رفع اشکال — عادت‌هایی که باعث می‌شود یادگیری جدی شود.",
    },
  ];

  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-lab-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <Badge variant="outline" className="mb-5 rounded-full px-3 py-1.5 font-mono text-[12px] font-medium">
              <span className="ml-1.5 inline-flex size-2 rounded-full bg-emerald-500" />
              تیم Genova
            </Badge>
            <h1 className="text-4xl font-black leading-[1.2] tracking-tight sm:text-5xl lg:text-[3.4rem] text-balance">
              ما یک تیم دانشجویی هستیم
              <span className="mt-1 block bg-gradient-to-l from-primary to-emerald-600 bg-clip-text text-transparent">
                که برای دانشجویان علوم زیستی آموزش می‌سازد
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              چهار دانشجوی میکروبیولوژی و یک دانشجوی بیوتکنولوژی که از
              تجربهٔ مستقیم مسیر دانشگاه، پلتفرمی ساخته‌اند تا مسیر یادگیری
              برای بقیهٔ دانشجوها شفاف‌تر و همراهانه‌تر باشد.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Story ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-card/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="داستان ما"
            title="از یک مشکل شخصی شروع شد"
          />
          <div className="mx-auto max-w-3xl space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
            <p>
              همهٔ ما یک تجربهٔ مشترک داشتیم: ترم اول دانشگاه، ورود به
              دنیای علوم زیستی، و سردرگمی از بین انبوه منابع، کتاب‌ها و
              توصیه‌های مختلف. کدام منابع معتبر است؟ روش مطالعه چگونه باشد؟
              برای امتحان چه بخوانیم؟
            </p>
            <p>
              تصمیم گرفتیم تجربه‌هایمان را مستند کنیم، محتوا بسازیم و در
              اختیار دانشجوهای بعدی بگذاریم. این شد شروع Genova — اول یک
              کانال تلگرامی ساده، بعد یک پلتفرم جامع آموزشی.
            </p>
            <p>
              امروز Genova شامل دوره، آزمون، فلش‌کارت، دیکشنری تخصصی،
              کارگاه و جامعهٔ آموزشی است. همهٔ این‌ها توسط تیمی ساخته
              می‌شود که خودش هنوز دانشجوست و مشکلات شما را از نزدیک
              می‌فهمد.
            </p>
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          kicker="اعضای تیم"
          title="تیمی از جنس خود دانشجوها"
          description="هر کدام از ما در یکی از حوزه‌های علوم زیستی تخصص داریم و مسئول بخشی از محتوا و محصولات هستیم."
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <Link
              key={member._id}
              to={`/instructors/${member.slug}`}
              className="group rounded-2xl border border-border/70 bg-card/70 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
            >
              <InstructorAvatar
                name={member.name}
                accent={member.accent}
                className="mx-auto size-16 text-base"
              />
              <p className="mt-4 text-center text-base font-bold transition-colors group-hover:text-primary">
                {member.name}
              </p>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {member.title}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {member.specialties.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="rounded-full text-[11px]"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-card/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="ارزش‌های ما"
            title="چرا Genova متفاوت است؟"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <Card key={v.title} className="border-border/70 bg-card/70 shadow-sm">
                <CardContent className="p-6">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <v.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-bold">{v.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                    {v.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, value: "+۴,۰۰۰", label: "دانشجوی همراه", color: "bg-primary/10 text-primary" },
            { icon: BookOpen, value: "+۸", label: "دوره تخصصی", color: "bg-emerald-500/10 text-emerald-600" },
            { icon: FlaskConical, value: "+۴۰", label: "تست استاندارد", color: "bg-violet-500/10 text-violet-600" },
            { icon: GraduationCap, value: "۵", label: "عضو تیم فعال", color: "bg-amber-500/10 text-amber-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card/70 p-5"
            >
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${s.color}`}>
                <s.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-primary to-emerald-700 p-8 text-white sm:p-12">
          <div className="absolute inset-0 bg-lab-grid opacity-20" />
          <div className="absolute -left-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative mx-auto max-w-3xl text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/15">
              <Dna className="size-7" />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold leading-9 sm:text-3xl text-balance">
              مأموریت ما: یادگیری علوم زیستی بدون سردرگمی
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/80 sm:text-[15px]">
              می‌خواهیم هر دانشجوی علوم زیستی، از ترم اول تا ارشد و
              پژوهش، مسیر یادگیری مشخصی داشته باشد و بداند روی چه
              مباحثی تمرکز کند.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-white px-8 text-primary hover:bg-white/90"
              >
                <Link to="/courses">
                  شروع یادگیری
                  <ArrowLeft className="mr-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-full px-8 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/auth?returnTo=%2Fdashboard">
                  عضویت رایگان
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

import { Link } from "react-router";
import { useApi } from "@/hooks/use-api";
import { accent, faNum, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpenCheck,
  Dna,
  GraduationCap,
  Microscope,
  Users,
  Sparkles,
  ChevronLeft,
} from "lucide-react";

export default function Landing() {
  const categories = useApi<any[]>("/api/content/categories");
  const courses = useApi<any[]>("/api/content/courses?featuredOnly=true&limit=4");
  const instructors = useApi<any[]>("/api/content/instructors");
  const testimonials = useApi<any[]>("/api/content/testimonials");

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
        <div className="absolute inset-0 bg-lab-grid opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-white/30">
            <Sparkles className="ml-1 size-3.5" /> پلتفرم تخصصی علوم زیستی
          </Badge>
          <h1 className="text-3xl font-black sm:text-5xl lg:text-6xl">
            مسیر یادگیری <span className="text-yellow-300">علوم زیستی</span>
            <br />از صفر تا حرفه‌ای
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
            دوره‌های تخصصی میکروبیولوژی و بیوتکنولوژی با تدریس اساتید باتجربه.
            آزمون، دیکشنری تخصصی، کارگاه عملی و هوش مصنوعی.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-white text-teal-700 hover:bg-white/90">
              <Link to="/courses">مشاهده دوره‌ها</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10">
              <Link to="/articles">مقالات رایگان</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border/70 bg-muted/30 py-8">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 px-4 sm:grid-cols-4">
          {[
            { icon: GraduationCap, label: "دانشجو", value: "۵۰۰+" },
            { icon: BookOpenCheck, label: "دوره", value: "۱۰+" },
            { icon: Microscope, label: "ساعت آموزش", value: "۲۰۰+" },
            { icon: Users, label: "مدرس", value: "۵" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1 text-center">
              <Icon className="size-6 text-primary" />
              <span className="text-xl font-extrabold">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-extrabold">دسته‌بندی دوره‌ها</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat: any) => {
              const a = accent(cat.accent);
              return (
                <Link
                  key={cat._id}
                  to={`/courses?category=${cat.slug}`}
                  className={cn("group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg")}
                >
                  <Badge className={cn("rounded-full ring-1", a.chip)}>{cat.name}</Badge>
                  <p className="mt-3 text-sm text-muted-foreground">{cat.description}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Courses */}
      {courses && courses.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">دوره‌های ویژه</h2>
            <Link to="/courses" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              مشاهده همه <ChevronLeft className="size-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((course: any) => {
              const a = accent(course.accent);
              return (
                <Link
                  key={course._id}
                  to={`/courses/${course.slug}`}
                  className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Badge className={cn("rounded-full ring-1 text-[11px]", a.chip)}>
                    {course.category?.name}
                  </Badge>
                  <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6">{course.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{course.summary}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {course.instructor?.name}
                    </span>
                    <span className="text-sm font-extrabold text-primary">
                      {formatPrice(course.discountPrice || course.price)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Instructors */}
      {instructors && instructors.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-extrabold">اساتید</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {instructors.map((ins: any) => (
              <Link
                key={ins._id}
                to={`/instructors/${ins.slug}`}
                className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {ins.name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold">{ins.name}</h3>
                    <p className="text-xs text-muted-foreground">{ins.title}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{ins.bio}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials && testimonials.length > 0 && (
        <section className="bg-muted/30 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-2xl font-extrabold text-center">نظرات دانشجویان</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 6).map((t: any, i: number) => (
                <Card key={i} className="border-border/70">
                  <CardContent className="p-5">
                    <p className="text-sm leading-7 text-muted-foreground">{t.text}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-sm font-bold">{t.name}</span>
                      <span className="text-xs text-muted-foreground">· {t.course}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

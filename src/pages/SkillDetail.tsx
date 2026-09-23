import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { CourseCard } from "@/components/site/CourseCard";
import { api } from "@/convex/_generated/api";
import { accent, faNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function SkillDetail() {
  const { slug = "" } = useParams();
  const skill = useQuery(api.skills.getSkillBySlug, { slug });

  if (skill === undefined) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="h-40 animate-pulse rounded-3xl border border-border/60 bg-card/50" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border border-border/60 bg-card/50" />
            ))}
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!skill) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <Layers className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-extrabold">مهارتی با این آدرس پیدا نشد</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            شاید این مهارت حذف یا از حالت انتشار خارج شده باشد.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/skills">بازگشت به مهارت‌ها</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const a = accent(skill.accent);
  const courses = (skill.courses ?? []) as any[];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Link
          to="/skills"
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowRight className="size-4" />
          همه مهارت‌ها
        </Link>

        {/* ── Skill hero ──────────────────────────────────────── */}
        <div className="relative mt-4 overflow-hidden rounded-3xl border border-border/70 p-6 sm:p-9">
          <div className={cn("absolute inset-0 bg-gradient-to-br", a.grad)} aria-hidden />
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-hidden />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br text-3xl shadow-lg ring-1 ring-white/20",
                a.grad,
              )}
            >
              {skill.icon?.trim() || "🧬"}
            </span>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                <Sparkles className="size-3.5" />
                صفحه اختصاصی مهارت
              </span>
              <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {skill.name}
              </h1>
              {skill.description && (
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  {skill.description}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-center">
              <span className="block text-2xl font-extrabold text-primary">
                {faNum(courses.length)}
              </span>
              <span className="block text-[11px] font-bold text-muted-foreground">دوره مرتبط</span>
            </span>
          </div>
        </div>

        {/* ── Related courses ─────────────────────────────────── */}
        <div className="mt-9">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-primary/80">
                step-by-step learning
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                دوره‌های مرتبط با «{skill.name}»
              </h2>
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/courses?track=genova_plus">ژنوا پلاس</Link>
            </Button>
          </div>

          {courses.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
              <Layers className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                هنوز دوره‌ای برای این مهارت منتشر نشده است.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                به‌زودی دوره‌های عملی و مرحله‌به‌مرحله این مهارت اضافه می‌شود.
              </p>
              <Button asChild className="mt-5 rounded-full" variant="outline">
                <Link to="/skills">مهارت‌های دیگر</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { ArrowLeft, Sparkles, Layers } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { accent, faNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const FIELDS: { value: string; label: string }[] = [
  { value: "all", label: "همه مهارت‌ها" },
  { value: "microbiology", label: "میکروبیولوژی" },
  { value: "biotech", label: "زیست‌فناوری" },
  { value: "genetics", label: "ژنتیک" },
  { value: "bioinformatics", label: "بیوانفورماتیک" },
  { value: "lab", label: "آزمایشگاه" },
  { value: "general", label: "عمومی" },
];

type SkillRow = {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  accent: string;
  field: string;
  courseCount: number;
};

export default function Skills() {
  const skills = useQuery(api.skills.listSkills);
  const [field, setField] = useState("all");

  const filtered = useMemo(() => {
    const rows = (skills ?? []) as SkillRow[];
    return field === "all" ? rows : rows.filter((s) => s.field === field);
  }, [skills, field]);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-emerald-500/5 p-6 sm:p-10">
          <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-10 size-44 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
              <Sparkles className="size-3.5" />
              مسیر مهارت‌محور ژنوا
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              مهارت‌ها
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[15px]">
              مهارت‌های تخصصی حوزه‌های زیست‌شناسی، زیست‌فناوری، میکروبیولوژی،
              ژنتیک، بیوانفورماتیک و آزمایشگاه — هر مهارت صفحه اختصاصی دارد و
              دوره‌های مرتبط با آن به‌صورت مرحله‌به‌مرحله همان‌جا ارائه می‌شود.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="sm" className="rounded-full">
                <Link to="/courses?track=genova_plus">
                  دوره‌های ژنوا پلاس
                  <ArrowLeft className="mr-1.5 size-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to="/courses">همه دوره‌ها</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Field filters ───────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap gap-2">
          {FIELDS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={field === f.value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setField(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* ── Grid ────────────────────────────────────────────── */}
        {skills === undefined ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-border/60 bg-card/50"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <Layers className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">هنوز مهارتی در این حوزه ثبت نشده است.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              فیلتر دیگری انتخاب کن یا به‌زودی محتوای جدید را ببین.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((skill) => {
              const a = accent(skill.accent);
              return (
                <Link key={skill._id} to={`/skills/${skill.slug}`} className="group block h-full">
                  <div className="h-full overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/5">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl ring-1 ring-white/10",
                          a.grad,
                        )}
                      >
                        {skill.icon?.trim() || "🧬"}
                      </span>
                      <span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                        {faNum(skill.courseCount)} دوره
                      </span>
                    </div>
                    <h2 className="mt-4 text-base font-extrabold leading-7 transition-colors group-hover:text-primary">
                      {skill.name}
                    </h2>
                    {skill.description && (
                      <p className="mt-1.5 line-clamp-3 text-[13px] leading-6 text-muted-foreground">
                        {skill.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      مشاهده دوره‌های این مهارت
                      <ArrowLeft className="size-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

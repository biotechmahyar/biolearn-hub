import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourseCard } from "@/components/site/CourseCard";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { faNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { Search } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";

export default function Courses() {
  const { isIran } = useMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "";
  const activeTrack = searchParams.get("track") ?? "";
  const [search, setSearch] = useState("");

  const categoriesConvex = useQuery(api.content.listCategories);
  const coursesConvex = useQuery(api.content.listCourses, {
    categorySlug: activeCategory || undefined,
    search: search || undefined,
    track: activeTrack === "genova_plus" ? "genova_plus" : undefined,
  });
  const { data: categoriesIran } = useApiQuery<any[]>("/api/content/categories");
  const { data: coursesIran } = useApiQuery<any[]>("/api/content/courses");
  const categories = isIran ? categoriesIran : categoriesConvex;
  const baseCourses = isIran ? coursesIran : coursesConvex;
  // Genova Plus track filter (also applied client-side for Iran mode data).
  const courses =
    activeTrack === "genova_plus"
      ? (baseCourses ?? []).filter((c: any) => c?.track === "genova_plus")
      : baseCourses;
  const coursesLoading = baseCourses === undefined;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">دوره‌های آموزشی</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            مسیر یادگیری تو از این‌جا شروع می‌شود
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            دوره‌های تخصصی علوم زیستی با پکیج کامل: ویدیو، جزوه، تست، فلش‌کارت،
            آزمون و رفع اشکال. دوره‌های رایگان را هم از همین‌جا شروع کن.
          </p>
        </div>

        {/* Genova Plus / standard track switch */}
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Button
            variant={!activeTrack ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setParam("track", "")}
          >
            همه دوره‌ها
          </Button>
          <Button
            variant={activeTrack === "genova_plus" ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setParam("track", activeTrack === "genova_plus" ? "" : "genova_plus")}
          >
            ✦ ژنوا پلاس
          </Button>
        </div>

        {/* Genova Plus intro banner */}
        {activeTrack === "genova_plus" && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-l from-amber-500/10 via-emerald-500/5 to-background p-5 sm:p-6">
            <div className="pointer-events-none absolute -left-10 -top-10 size-32 rounded-full bg-amber-400/15 blur-3xl" />
            <div className="relative max-w-3xl">
              <p className="font-mono text-[11px] uppercase tracking-widest text-amber-500">
                genova plus — مهارت‌محور
              </p>
              <h2 className="mt-1.5 text-lg font-extrabold sm:text-xl">
                ژنوا پلاس؛ آموزش‌های تخصصی و عملی مرحله‌به‌مرحله
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                دوره‌های تخصصی‌تر و مهارت‌محور ژنوا با تمرکز بر اجرای عملی، تجهیزات
                آزمایشگاهی و تمرین‌های کاربردی طراحی شده‌اند؛ دانشجو در این دوره‌ها
                صرفاً تئوری یاد نمی‌گیرد و واقعاً مهارت موردنظر را تا سطح تسلط
                تمرین می‌کند. به همین دلیل به دلیل امکانات، تجهیزات و آموزش
                تخصصی، هزینه بیشتری نسبت به دوره‌های معمولی ژنوا دارند.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["مهارت‌های تخصصی", "دوره‌های عملی", "دوره‌های مجازی", "آموزش مهارتی"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!activeCategory ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setParam("category", "")}
            >
              همه
            </Button>
            {(categories ?? []).map((cat) => (
              <Button
                key={cat._id}
                variant={activeCategory === cat.slug ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setParam("category", activeCategory === cat.slug ? "" : cat.slug)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی دوره..."
              className="pr-9"
            />
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {courses
            ? `${faNum(courses.length)} دوره${activeTrack === "genova_plus" ? " ژنوا پلاس" : ""}`
            : "..."}
        </p>

        {courses && courses.length === 0 && !coursesLoading && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <p className="text-sm font-medium">
              {activeTrack === "genova_plus"
                ? "هنوز دوره‌ای در ژنوا پلاس منتشر نشده است."
                : "دوره‌ای پیدا نشد."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeTrack === "genova_plus"
                ? "به‌زودی دوره‌های عملی و مهارت‌محور جدید اضافه می‌شود."
                : "فیلترها را تغییر بده یا عبارت دیگری جستجو کن."}
            </p>
          </div>
        )}

        <div className={cn("mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3")}>
          {(courses ?? []).map((course) => (
            <CourseCard key={course._id} course={course as any} />
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

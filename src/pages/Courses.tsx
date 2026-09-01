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
  const [search, setSearch] = useState("");

  const categoriesConvex = useQuery(api.content.listCategories);
  const coursesConvex = useQuery(api.content.listCourses, {
    categorySlug: activeCategory || undefined,
    search: search || undefined,
  });
  const { data: categoriesIran } = useApiQuery<any[]>("/api/content/categories");
  const { data: coursesIran } = useApiQuery<any[]>("/api/content/courses");
  const categories = isIran ? categoriesIran : categoriesConvex;
  const courses = isIran ? coursesIran : coursesConvex;

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

        {/* Filters */}
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!activeCategory ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setSearchParams({})}
            >
              همه
            </Button>
            {(categories ?? []).map((cat) => (
              <Button
                key={cat._id}
                variant={activeCategory === cat.slug ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setSearchParams(activeCategory === cat.slug ? {} : { category: cat.slug })
                }
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
          {courses ? `${faNum(courses.length)} دوره` : "..."}
        </p>

        {courses && courses.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <p className="text-sm font-medium">دوره‌ای پیدا نشد.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              فیلترها را تغییر بده یا عبارت دیگری جستجو کن.
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

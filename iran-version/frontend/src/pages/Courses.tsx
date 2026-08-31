import { Link } from "react-router";
import { useApi } from "@/hooks/use-api";
import { accent, faNum, formatPrice, MODE_LABELS, BUNDLE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Star, Users } from "lucide-react";

export default function Courses() {
  const courses = useApi<any[]>("/api/content/courses");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">دوره‌های آموزشی</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">دوره‌های تخصصی علوم زیستی</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          از میکروبیولوژی تا بیوتکنولوژی — دوره‌های عملی با پروژه و آزمون.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(courses ?? []).map((course: any) => {
          const a = accent(course.accent);
          return (
            <Link
              key={course._id}
              to={`/courses/${course.slug}`}
              className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <Badge className={cn("rounded-full ring-1", a.chip)}>
                  {course.category?.name}
                </Badge>
                {course.featured && <Badge className="rounded-full bg-amber-500/10 text-amber-700 ring-amber-500/30">ویژه</Badge>}
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6">{course.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{course.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="size-3" /> {faNum(course.studentsCount || 0)}</span>
                <span className="flex items-center gap-1"><Star className="size-3" /> {faNum(course.rating || 0)}</span>
                <span className="flex items-center gap-1"><Clock className="size-3" /> {course.durationText}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-xs text-muted-foreground">{course.instructor?.name}</span>
                <span className="text-sm font-extrabold text-primary">
                  {formatPrice(course.discountPrice || course.price)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {courses && courses.length === 0 && (
        <div className="mt-20 text-center text-muted-foreground">
          <BookOpen className="mx-auto size-12 opacity-30" />
          <p className="mt-3">هنوز دوره‌ای منتشر نشده.</p>
        </div>
      )}
    </div>
  );
}

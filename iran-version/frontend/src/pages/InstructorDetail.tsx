import { Link, useParams } from "react-router";
import { useApi } from "@/hooks/use-api";
import { accent, formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, GraduationCap, Mic2, BookOpen } from "lucide-react";

export default function InstructorDetail() {
  const { slug = "" } = useParams();
  const instructor = useApi<any>(slug ? `/api/content/instructors/${slug}` : null);

  if (instructor === undefined) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">در حال بارگذاری...</div>;
  if (!instructor) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">مدرس پیدا نشد.</div>;

  const a = accent(instructor.accent);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">خانه</Link>
        <ChevronLeft className="size-3.5" />
        <Link to="/instructors" className="hover:text-foreground">اساتید</Link>
        <ChevronLeft className="size-3.5" />
        <span className="text-foreground">{instructor.name}</span>
      </nav>

      <Card className="border-border/70 bg-gradient-to-br from-card to-muted/50">
        <div className="p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {instructor.name?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">{instructor.name}</h1>
              <p className="text-sm text-muted-foreground">{instructor.title}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">{instructor.bio}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold"><GraduationCap className="size-4 text-primary" /> تحصیلات</h3>
              <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                {(instructor.education || []).map((e: string) => (
                  <li key={e} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> {e}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold"><Mic2 className="size-4 text-primary" /> تخصص‌ها</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(instructor.specialties || []).map((s: string) => (
                  <span key={s} className="rounded-full bg-primary/10 px-3 py-1.5 text-[13px] font-medium text-primary">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Courses */}
      {instructor.courses && instructor.courses.length > 0 && (
        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-extrabold"><BookOpen className="size-5 text-primary" /> دوره‌ها</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {instructor.courses.map((c: any) => (
              <Link key={c._id} to={`/courses/${c.slug}`} className="rounded-2xl border border-border/70 bg-card p-5 transition-all hover:shadow-lg">
                <h3 className="font-bold">{c.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{c.summary}</p>
                <p className="mt-3 text-sm font-extrabold text-primary">{formatPrice(c.discountPrice || c.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Import Card here since it's used inline
import { Card, CardContent } from "@/components/ui/card";

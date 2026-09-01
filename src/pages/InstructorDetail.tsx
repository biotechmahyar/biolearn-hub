import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/site/CourseCard";
import { InstructorAvatar } from "@/components/site/InstructorAvatar";
import { PublicLayout } from "@/components/site/PublicLayout";
import { WorkshopCard } from "@/components/site/WorkshopCard";
import { api } from "@/convex/_generated/api";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { accent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { BadgeCheck, BookOpen, ChevronLeft, GraduationCap, Mic2 } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";

export default function InstructorDetail() {
  const { slug = "" } = useParams();
  const { isIran } = useMode();
  const instructorConvex = useQuery(api.content.getInstructorBySlug, { slug });
  const { data: instructorsIran } = useApiQuery<any[]>(isIran ? "/api/content/instructors" : "");
  const instructor = useMemo(() => {
    if (isIran && instructorsIran) {
      const found = instructorsIran.find((i: any) => i.slug === slug);
      return found ? { ...found, _id: found.id } : null;
    }
    return instructorConvex;
  }, [isIran, instructorsIran, instructorConvex, slug]);

  if (instructor === undefined) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          در حال بارگذاری...
        </div>
      </PublicLayout>
    );
  }
  if (!instructor) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          مدرس پیدا نشد.
        </div>
      </PublicLayout>
    );
  }

  const a = accent(instructor.accent);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">خانه</Link>
          <ChevronLeft className="size-3.5" />
          <Link to="/instructors" className="hover:text-foreground">اساتید</Link>
          <ChevronLeft className="size-3.5" />
          <span className="text-foreground">{instructor.name}</span>
        </nav>

        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card to-muted/50 p-8 sm:p-10">
          <div className="absolute inset-0 bg-lab-grid opacity-20" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
            <InstructorAvatar name={instructor.name} accent={instructor.accent} className="size-20 text-lg" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold sm:text-3xl">{instructor.name}</h1>
                {instructor.verified && (
                  <Badge variant="secondary" className={cn("gap-1 rounded-full ring-1", a.chip)}>
                    <BadgeCheck className="size-3.5" />
                    تأییدشده
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-sm font-medium text-primary">{instructor.title}</p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                {instructor.bio}
              </p>
            </div>
          </div>

          <div className="relative mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <GraduationCap className="size-4 text-primary" />
                تحصیلات
              </h3>
              <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                {instructor.education.map((e: any) => (
                  <li key={e} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Mic2 className="size-4 text-primary" />
                تخصص‌ها
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {instructor.specialties.map((s: any) => (
                  <span key={s} className="rounded-full bg-primary/10 px-3 py-1.5 text-[13px] font-medium text-primary">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {instructor.courses.length > 0 && (
          <div className="mt-12">
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <BookOpen className="size-5 text-primary" />
              دوره‌های این مدرس
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {instructor.courses.map((course: any) => (
                <CourseCard key={course._id} course={course as any} />
              ))}
            </div>
          </div>
        )}

        {instructor.workshops.length > 0 && (
          <div className="mt-12">
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <Mic2 className="size-5 text-primary" />
              کارگاه‌ها و نشست‌ها
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {instructor.workshops.map((w: any) => (
                <WorkshopCard key={w._id} workshop={w as any} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/courses">مشاهدهٔ همه دوره‌ها</Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}

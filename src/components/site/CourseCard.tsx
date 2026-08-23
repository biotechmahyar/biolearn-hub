import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { accent, BUNDLE_LABELS, faNum, formatPrice, MODE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookOpen, Clock, PlayCircle, Star, Users } from "lucide-react";
import { Link } from "react-router";
import { iconFor } from "./icons";

type Course = {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  mode: string;
  price: number;
  discountPrice?: number;
  rating: number;
  ratingCount: number;
  studentsCount: number;
  accent: string;
  bundle: string;
  syllabus: { title: string; durationMin: number; free: boolean }[];
  category?: { name: string; slug: string; accent: string } | null;
  featured?: boolean;
};

export function CourseCard({ course }: { course: Course }) {
  const a = accent(course.accent);
  const Icon = iconFor(course.category?.slug === "general-guide" ? "graduation" : undefined);
  const totalMin = course.syllabus.reduce((acc, l) => acc + l.durationMin, 0);
  const effective = course.discountPrice ?? course.price;
  const hasDiscount = !!course.discountPrice && course.discountPrice < course.price;

  return (
    <Link to={`/courses/${course.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-border/70 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-primary/5">
        {/* Art */}
        <div className={cn("relative h-36 overflow-hidden bg-gradient-to-br", a.grad)}>
          <div className="absolute inset-0 bg-lab-grid opacity-40" />
          <div className="absolute -left-6 -top-6 size-28 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -right-4 size-32 rounded-full bg-black/10 blur-2xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="size-12 text-white/90 drop-shadow-sm" />
          </div>
          <div className="absolute right-3 top-3 flex gap-2">
            <Badge className="border-0 bg-black/25 text-white backdrop-blur-sm">
              {MODE_LABELS[course.mode] ?? course.mode}
            </Badge>
            {hasDiscount && (
              <Badge className="border-0 bg-white/90 text-primary">
                تخفیف
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className={cn("rounded-full ring-1", a.chip)}>
              {course.category?.name ?? "دوره"}
            </Badge>
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {faNum(course.rating)}
              <span className="text-muted-foreground/70">({faNum(course.ratingCount)})</span>
            </span>
          </div>

          <h3 className="mt-2.5 line-clamp-2 text-[15px] font-bold leading-6 transition-colors group-hover:text-primary">
            {course.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
            {course.summary}
          </p>

          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <PlayCircle className="size-3.5" />
              {faNum(course.syllabus.length)} جلسه
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {faNum(Math.round(totalMin / 60))} ساعت
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {faNum(course.studentsCount)}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3.5">
            <div className="flex items-baseline gap-2">
              {course.price === 0 ? (
                <span className="text-base font-extrabold text-emerald-500">رایگان</span>
              ) : (
                <>
                  <span className="text-base font-extrabold">{formatPrice(effective)}</span>
                  {hasDiscount && (
                    <span className="text-xs text-muted-foreground line-through">
                      {faNum(course.price)}
                    </span>
                  )}
                </>
              )}
            </div>
            <Badge variant="outline" className="rounded-full">
              {BUNDLE_LABELS[course.bundle] ?? course.bundle}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

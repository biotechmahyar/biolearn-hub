import { Badge } from "@/components/ui/badge";
import { InstructorAvatar } from "@/components/site/InstructorAvatar";
import { PublicLayout } from "@/components/site/PublicLayout";
import { useApiQuery } from "@/hooks/use-api";
import { accent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BadgeCheck, ChevronLeft } from "lucide-react";
import { Link } from "react-router";

export default function Instructors() {
  const instructors = useApiQuery<any[]>("/api/content/instructors");

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">مدرس‌ها و تیم</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            کسانی که مسیر را خودشان رفته‌اند
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            تیم اصلی Genova چهار دانشجوی میکروبیولوژی و یک دانشجوی بیوتکنولوژی
            است؛ مدرسان مهمان متخصص هم کارگاه‌ها و دوره‌های تخصصی را برگزار
            می‌کنند. برند متعلق به پلتفرم است، نه به یک فرد خاص.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(instructors ?? []).map((ins) => {
            const a = accent(ins.accent);
            return (
              <Link
                key={ins._id}
                to={`/instructors/${ins.slug}`}
                className="group rounded-2xl border border-border/70 bg-card/70 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between">
                  <InstructorAvatar name={ins.name} accent={ins.accent} className="size-14 text-sm" />
                  {ins.verified && (
                    <Badge variant="secondary" className={cn("gap-1 rounded-full ring-1", a.chip)}>
                      <BadgeCheck className="size-3.5" />
                      تأییدشده
                    </Badge>
                  )}
                </div>
                <h3 className="mt-4 text-[15px] font-bold transition-colors group-hover:text-primary">
                  {ins.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{ins.title}</p>
                <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-[13px] leading-6 text-muted-foreground">
                  {ins.bio}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {ins.specialties.slice(0, 3).map((s: string) => (
                    <span key={s} className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  مشاهدهٔ پروفایل
                  <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}

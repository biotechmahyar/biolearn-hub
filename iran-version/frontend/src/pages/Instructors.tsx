import { Link } from "react-router";
import { useApi } from "@/hooks/use-api";
import { accent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function Instructors() {
  const instructors = useApi<any[]>("/api/content/instructors");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">مدرس‌ها و تیم</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">اساتید ما</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          تیم اصلی Genova چهار دانشجوی میکروبیولوژی و یک دانشجوی بیوتکنولوژی است.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(instructors ?? []).map((ins: any) => {
          const a = accent(ins.accent);
          return (
            <Link
              key={ins._id}
              to={`/instructors/${ins.slug}`}
              className="group rounded-2xl border border-border/70 bg-card/70 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                  {ins.name?.[0]}
                </div>
                <div>
                  <h3 className="font-bold">{ins.name}</h3>
                  <p className="text-xs text-muted-foreground">{ins.title}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-muted-foreground">{ins.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(ins.specialties || []).slice(0, 3).map((s: string) => (
                  <span key={s} className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{s}</span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {instructors && instructors.length === 0 && (
        <div className="mt-20 text-center text-muted-foreground">
          <Users className="mx-auto size-12 opacity-30" />
          <p className="mt-3">هنوز استادی اضافه نشده.</p>
        </div>
      )}
    </div>
  );
}

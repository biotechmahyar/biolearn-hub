import { Link } from "react-router";
import { useApi } from "@/hooks/use-api";
import { faNum, formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users } from "lucide-react";

export default function Workshops() {
  const workshops = useApi<any[]>("/api/content/workshops");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">کارگاه‌ها و نشست‌ها</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">کارگاه‌های تخصصی</h1>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(workshops ?? []).map((ws: any) => (
          <Link
            key={ws._id}
            to={`/workshops/${ws.slug}`}
            className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>{ws.date}</span>
              <span>·</span>
              <span>{ws.time}</span>
            </div>
            <h3 className="mt-3 font-bold">{ws.title}</h3>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{ws.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3" /> {faNum(ws.registeredCount || 0)}/{faNum(ws.capacity || 0)}
              </span>
              <span className="text-sm font-extrabold text-primary">
                {ws.free ? "رایگان" : formatPrice(ws.price)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

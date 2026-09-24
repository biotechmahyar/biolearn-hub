import { api } from "@/convex/_generated/api";
import { faNum, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { CheckCircle2, ChevronLeft, Clock3, Loader2, MapPin, Route, Trophy } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function AcademyPathTabRedesigned() {
  const paths = useQuery(api.academyPaths.listPublishedPathsWithPricing);
  const enrolledWorkshops = useQuery(api.academyPaths.listMyPathProgress);

  if (paths === undefined) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }
  if (paths.length === 0) {
    return <div className="rounded-3xl border border-dashed border-primary/25 bg-primary/5 p-12 text-center"><Route className="mx-auto size-9 text-primary" /><h1 className="mt-3 text-lg font-extrabold">مسیری منتشر نشده</h1><p className="mt-1 text-sm text-muted-foreground">سلسله کارگاه‌های آکادمی به‌زودی اینجا نمایش داده می‌شود.</p></div>;
  }

  const isEnrolled = (workshopId: string) => (enrolledWorkshops ?? []).includes(workshopId as any);

  return (
    <div className="space-y-8">
      {paths.map((path) => {
        const total = path.items.length;
        const completed = path.items.filter((item) => isEnrolled(item.workshopId)).length;
        const progress = total ? Math.round((completed / total) * 100) : 0;
        const price = path.discountPrice ?? path.price ?? 0;
        const pathIsFree = path.free ?? price === 0;
        const tone = path.color === "violet" ? "violet" : path.color === "amber" ? "amber" : path.color === "sky" ? "sky" : "emerald";
        const toneClass = tone === "violet" ? "bg-violet-500/10 text-violet-600" : tone === "amber" ? "bg-amber-500/10 text-amber-600" : tone === "sky" ? "bg-sky-500/10 text-sky-600" : "bg-emerald-500/10 text-emerald-600";

        return (
          <section key={path._id} className="space-y-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-bl from-primary/10 via-card to-card p-5 sm:p-7">
              <div className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 right-10 size-48 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div className="max-w-2xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold", toneClass)}><Route className="size-3.5" /> مسیر تخصصی</span>
                    <span className="rounded-full bg-background/70 px-3 py-1 text-[11px] font-bold text-muted-foreground">{path.level === "beginner" ? "مبتدی" : path.level === "intermediate" ? "متوسط" : path.level === "advanced" ? "پیشرفته" : "ترکیبی"}</span>
                    <span className="rounded-full bg-background/70 px-3 py-1 text-[11px] font-bold text-muted-foreground">{faNum(total)} ایستگاه آموزشی</span>
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{path.title}</h1>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{path.description}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-extrabold">{pathIsFree ? "رایگان" : formatPrice(price)}</span>
                    {path.discountPrice ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600">تخفیف فعال</span> : null}
                    <Button asChild size="sm" variant="outline" className="rounded-full"><Link to={`/academy-path/${path.slug}`}>جزئیات مسیر <ChevronLeft className="size-3.5" /></Link></Button>
                  </div>
                </div>
                <div className="w-full rounded-2xl border border-background/80 bg-background/75 p-4 lg:w-64">
                  <div className="flex items-end justify-between"><div><p className="text-[11px] font-bold text-muted-foreground">سفر تو</p><p className="mt-1 text-2xl font-extrabold text-primary">{faNum(progress)}٪</p></div><Trophy className="size-8 text-amber-500" /></div>
                  <Progress value={progress} className="mt-3 h-2.5" />
                  <p className="mt-2 text-[11px] text-muted-foreground">{faNum(completed)} از {faNum(total)} ایستگاه تکمیل شده</p>
                </div>
              </div>
            </div>

            <div className="pr-1">
              <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-extrabold"><MapPin className="size-5 text-primary" /> نقشه راه یادگیری</h2><p className="mt-1 text-xs text-muted-foreground">هر ایستگاه، قدم بعدی تو در این مسیر تخصصی است.</p></div><span className="hidden text-xs font-bold text-muted-foreground sm:block">از پایه تا پیشرفته</span></div>
              <div className="relative space-y-4 pr-12">
                <svg className="pointer-events-none absolute bottom-8 right-[1.35rem] top-8 h-[calc(100%-4rem)] w-8" viewBox="0 0 32 600" preserveAspectRatio="none" aria-hidden="true">
                  <defs><linearGradient id={`academy-road-${path._id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0.08" /></linearGradient></defs>
                  <path d="M16 0 C30 45 4 85 16 130 S30 215 16 260 S4 345 16 390 S30 465 16 510 S4 575 16 600" fill="none" stroke={`url(#academy-road-${path._id})`} strokeWidth="2.5" strokeDasharray="7 7" />
                </svg>
                {path.items.map((item, index) => {
                  const enrolled = isEnrolled(item.workshopId);
                  const itemPrice = item.price ?? 0;
                  const itemIsFree = item.free ?? itemPrice === 0;
                  const hasSchedule = Boolean(item.date);
                  const isPast = hasSchedule && new Date(item.date).getTime() < Date.now();
                  const isNext = !enrolled && !isPast && (index === 0 || isEnrolled(path.items[index - 1].workshopId));
                  const statusLabel = isPast
                    ? "برگزار شده"
                    : !hasSchedule
                      ? "به‌زودی"
                      : itemIsFree
                        ? "ثبت‌نام رایگان"
                        : "ثبت‌نام با پرداخت";
                  return (
                    <div key={item.itemId} className="relative">
                      <span className={cn("absolute -right-12 top-7 z-10 flex size-9 -translate-x-1/2 items-center justify-center rounded-2xl border-4 border-background text-xs font-extrabold shadow-sm", enrolled ? "bg-emerald-500 text-white" : isNext ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{enrolled ? <CheckCircle2 className="size-4" /> : <span>{faNum(index + 1)}</span>}</span>
                      <Card className={cn("overflow-hidden border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md", enrolled && "border-emerald-500/25", isNext && "border-primary/35")}>
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-[10px] font-extrabold text-muted-foreground">ایستگاه {faNum(index + 1)}</span>{enrolled ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">تکمیل‌شده</span> : isNext ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">قدم بعدی</span> : null}</div><h3 className="text-sm font-extrabold sm:text-base">{item.title}</h3><p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">{item.topic}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground"><span>{item.date ? new Date(item.date).toLocaleDateString("fa-IR") : "زمان اعلام می‌شود"}</span>{item.time ? <span className="flex items-center gap-1"><Clock3 className="size-3" /> ساعت {item.time}</span> : null}<span className="font-bold text-emerald-600">{item.free ? "رایگان" : formatPrice(item.price)}</span></div></div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5 text-left">
                              {enrolled ? (
                                <Button size="sm" variant="outline" className="rounded-full" asChild>
                                  <Link to={`/workshops/${item.slug}`}>ورود به کارگاه</Link>
                                </Button>
                              ) : (
                                <>
                                  <span className={cn(
                                    "rounded-full px-3 py-1.5 text-[11px] font-bold",
                                    isPast
                                      ? "bg-muted text-muted-foreground"
                                      : !hasSchedule
                                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                        : itemIsFree
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                          : "bg-primary/10 text-primary",
                                  )}>
                                    {statusLabel}
                                  </span>
                                  {!isPast ? (
                                    <span className="text-[10px] text-muted-foreground">
                                      {hasSchedule ? "ثبت‌نام از صفحه کارگاه" : "زمان ثبت‌نام اعلام می‌شود"}
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

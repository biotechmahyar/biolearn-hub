import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckoutDialog } from "@/components/site/CheckoutDialog";
import { InstructorAvatar } from "@/components/site/InstructorAvatar";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { faNum, formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock, Users } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

export default function WorkshopDetail() {
  const { slug = "" } = useParams();
  const workshop = useQuery(api.content.getWorkshopBySlug, { slug });
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (workshop === undefined) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          در حال بارگذاری...
        </div>
      </PublicLayout>
    );
  }
  if (!workshop) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          کارگاه پیدا نشد.
        </div>
      </PublicLayout>
    );
  }

  const a = (workshop.instructor as any)?.accent ?? "teal";
  const fill = Math.min(100, Math.round((workshop.registeredCount / Math.max(1, workshop.capacity)) * 100));
  const full = workshop.registeredCount >= workshop.capacity;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">خانه</Link>
          <ChevronLeft className="size-3.5" />
          <Link to="/workshops" className="hover:text-foreground">کارگاه‌ها</Link>
          <ChevronLeft className="size-3.5" />
          <span className="text-foreground">{workshop.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                {workshop.topic}
              </Badge>
              {workshop.expertTalk && (
                <Badge className="border-0 bg-emerald-500/10 text-emerald-700">نشست رایگان</Badge>
              )}
              {full && <Badge variant="destructive">ظرفیت تکمیل</Badge>}
            </div>
            <h1 className="mt-4 text-2xl font-extrabold leading-10 sm:text-3xl">
              {workshop.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
              {workshop.description}
            </p>

            {workshop.instructor && (
              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border/70 bg-card/60 p-5">
                <InstructorAvatar name={workshop.instructor.name} accent={a} className="size-14 text-sm" />
                <div>
                  <p className="text-[15px] font-bold">{workshop.instructor.name}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {workshop.instructor.title}
                  </p>
                </div>
              </div>
            )}

            {workshop.agenda.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-extrabold">سرفصل‌های کارگاه</h2>
                <div className="mt-4 space-y-2.5">
                  {workshop.agenda.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {faNum(i + 1)}
                      </span>
                      <span className="text-sm leading-6">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="border-border/70 shadow-lg shadow-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black">
                    {workshop.free || workshop.price === 0 ? (
                      <span className="text-emerald-600">رایگان</span>
                    ) : (
                      formatPrice(workshop.price)
                    )}
                  </span>
                  <Badge variant="outline" className="rounded-full">
                    آنلاین
                  </Badge>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <CalendarDays className="size-4 text-primary" />
                    {formatDate(workshop.date)}
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Clock className="size-4 text-primary" />
                    ساعت {workshop.time}
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Users className="size-4 text-primary" />
                    {faNum(workshop.registeredCount)} از {faNum(workshop.capacity)} نفر ثبت‌نام کرده‌اند
                  </div>
                </div>

                <Progress value={fill} className="mt-4 h-2" />

                <Button
                  size="lg"
                  className="mt-6 w-full rounded-full"
                  disabled={full}
                  onClick={() => setCheckoutOpen(true)}
                >
                  {full ? "ظرفیت تکمیل شده" : workshop.free || workshop.price === 0 ? "ثبت‌نام رایگان" : "ثبت‌نام در کارگاه"}
                </Button>
                <ul className="mt-5 space-y-2 text-[13px] text-muted-foreground">
                  {["لینک حضور پس از ثبت‌نام ارسال می‌شود", "ضبط جلسه برای ثبت‌نامی‌ها", "گواهی شرکت"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={[
          {
            type: "workshop",
            refId: workshop._id,
            title: workshop.title,
            price: workshop.free ? 0 : workshop.price,
          },
        ]}
        successTitle="ثبت‌نام شما انجام شد"
        successDescription="جزئیات و لینک حضور از طریق پنل دانشجویی و پیام‌رسان برایتان ارسال می‌شود."
      />
    </PublicLayout>
  );
}

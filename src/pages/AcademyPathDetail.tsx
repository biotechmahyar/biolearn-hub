import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { faNum, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  MapPin,
  Route as RouteIcon,
  Sparkles,
  User,
} from "lucide-react";

const LEVELS: Record<string, string> = {
  beginner: "مبتدی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
  mixed: "ترکیبی",
};

export default function AcademyPathDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const path = useQuery(api.academyPaths.getPathBySlug, { slug: slug ?? "" });
  const purchasePath = useMutation(api.academyPaths.purchasePath);

  const [pathCheckoutOpen, setPathCheckoutOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [buying, setBuying] = useState(false);

  if (path === undefined) {
    return (
      <PublicLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (!path) {
    return (
      <PublicLayout>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
          <RouteIcon className="size-10 text-muted-foreground/40" />
          <h1 className="text-2xl font-extrabold">مسیر یافت نشد</h1>
          <p className="text-sm text-muted-foreground">
            این مسیر وجود ندارد یا هنوز منتشر نشده است.
          </p>
          <Button asChild className="rounded-full">
            <Link to="/workshops">بازگشت به کارگاه‌ها</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const now = Date.now();
  const activeDiscount =
    path.discountPrice && path.discountExpiresAt && path.discountExpiresAt > now
      ? path.discountPrice
      : null;
  const effectivePrice = activeDiscount ?? path.price;
  const isFree = effectivePrice === 0;
  const totalWorkshops = path.items.length;
  const availableCount = path.items.filter((i) => !i.comingSoon).length;

  const handleBuyPath = async () => {
    if (!isAuthenticated) {
      toast.error("برای خرید ابتدا وارد حساب شوید.");
      return;
    }
    setBuying(true);
    try {
      const res = await purchasePath({
        pathId: path._id,
        couponCode: coupon.trim() || undefined,
      });
      toast.success(
        res.total === 0
          ? "دسترسی کامل مسیر برای شما فعال شد!"
          : `خرید موفق — فاکتور ${res.invoiceNumber}`,
      );
      setPathCheckoutOpen(false);
      setCoupon("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در خرید");
    } finally {
      setBuying(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Path header */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-7 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                  <RouteIcon className="size-3.5" />
                  مسیر آکادمی
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
                  {LEVELS[path.level] ?? path.level}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
                  {faNum(totalWorkshops)} کارگاه
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {path.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {path.description}
              </p>
            </div>

            {/* Purchase card */}
            {!path.hasFullAccess && (
              <Card className="w-full shrink-0 border-primary/20 sm:w-72">
                <CardContent className="space-y-3 py-5">
                  <p className="text-xs font-bold text-muted-foreground">
                    دسترسی کامل مسیر
                  </p>
                  {isFree ? (
                    <p className="text-2xl font-extrabold text-primary">رایگان</p>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-extrabold text-primary">
                          {formatPrice(effectivePrice)}
                        </p>
                        {activeDiscount && (
                          <p className="text-sm text-muted-foreground line-through">
                            {formatPrice(path.price)}
                          </p>
                        )}
                      </div>
                      {activeDiscount && (
                        <p className="mt-0.5 text-[11px] font-bold text-emerald-600">
                          تخفیف ویژه فعال است
                        </p>
                      )}
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        شامل تمام {faNum(totalWorkshops)} کارگاه موجود و کارگاه‌های
                        آیندهٔ این مسیر
                      </p>
                    </div>
                  )}
                  <Button
                    className="w-full rounded-full"
                    onClick={() =>
                      isFree ? void handleBuyPath() : setPathCheckoutOpen(true)
                    }
                    disabled={buying}
                  >
                    {buying ? (
                      <Loader2 className="ml-1.5 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="ml-1.5 size-4" />
                    )}
                    {isFree ? "ثبت‌نام رایگان در مسیر" : "خرید کل مسیر"}
                  </Button>
                  <p className="text-center text-[10px] text-muted-foreground">
                    یا هر کارگاه را جداگانه از لیست زیر بخرید
                  </p>
                </CardContent>
              </Card>
            )}

            {path.hasFullAccess && (
              <div className="flex w-full shrink-0 items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:w-72">
                <CheckCircle2 className="size-6 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-bold text-emerald-600">
                    دسترسی کامل فعال است
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    به همهٔ کارگاه‌های این مسیر دسترسی دارید.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Roadmap */}
        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <MapPin className="size-5 text-primary" />
            نقشهٔ راه مسیر
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            کارگاه‌ها به ترتیب پیشنهادی از مقدماتی به پیشرفته — کارگاه‌های
            «به‌زودی» هنوز نهایی نشده‌اند.
          </p>

          {totalWorkshops === 0 ? (
            <Card className="mt-5 border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <RouteIcon className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  هنوز کارگاهی به این مسیر اضافه نشده است.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative mt-6 space-y-4 pr-6">
              {/* Timeline spine */}
              <div className="absolute bottom-4 right-[9px] top-4 w-0.5 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />

              {path.items.map((item, idx) => {
                const owned =
                  path.hasFullAccess || path.ownedWorkshopIds.includes(item.workshopId);
                const past = item.isPast;
                const soon = item.comingSoon && !past;
                return (
                  <div key={item.itemId} className="relative">
                    {/* Node dot */}
                    <span
                      className={cn(
                        "absolute -right-6 top-6 flex size-5 items-center justify-center rounded-full border-2 text-[9px] font-bold",
                        owned
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : past
                            ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                            : soon
                              ? "border-amber-500/50 bg-amber-500/10"
                              : "border-primary bg-primary/10 text-primary",
                      )}
                    >
                      {owned ? "✓" : faNum(idx + 1)}
                    </span>

                    <Card
                      className={cn(
                        "transition-all",
                        owned
                          ? "border-emerald-500/30"
                          : soon
                            ? "border-amber-500/25 opacity-90"
                            : "border-border/70 hover:-translate-y-0.5 hover:shadow-md",
                        past && "opacity-70",
                      )}
                    >
                      <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold">{item.title}</p>
                            {soon && (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                                به‌زودی
                              </span>
                            )}
                            {owned && (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                خریداری‌شده
                              </span>
                            )}
                          </div>
                          {item.topic && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {item.topic}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            {item.instructorName && (
                              <span className="flex items-center gap-1">
                                <User className="size-3" />
                                {item.instructorName}
                              </span>
                            )}
                            {item.date && !soon && (
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" />
                                {new Date(item.date).toLocaleDateString("fa-IR")}
                                {item.time && ` · ${item.time}`}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {item.registeredCount >= item.capacity && item.capacity > 0
                                ? "ظرفیت تکمیل"
                                : `ظرفیت ${faNum(item.capacity)}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {owned ? (
                            <Button
                              size="sm"
                              className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-500"
                              asChild
                            >
                              <Link to={`/workshops/${item.slug}`}>
                                ورود به کارگاه
                              </Link>
                            </Button>
                          ) : soon ? (
                            <Button size="sm" variant="outline" className="h-8 rounded-full" disabled>
                              <Lock className="ml-1 size-3" />
                              به‌زودی
                            </Button>
                          ) : past ? (
                            <Button size="sm" variant="outline" className="h-8 rounded-full" disabled>
                              به پایان رسیده
                            </Button>
                          ) : (
                            <>
                              <span className="text-xs font-bold text-primary">
                                {item.free || item.price === 0
                                  ? "رایگان"
                                  : formatPrice(item.price)}
                              </span>
                              <Button size="sm" className="h-8 rounded-full" asChild>
                                <Link to={`/workshops/${item.slug}`}>
                                  مشاهده و ثبت‌نام
                                  <ArrowLeft className="mr-1 size-3" />
                                </Link>
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Path purchase dialog — price & coupon, backend-enforced */}
        <Dialog open={pathCheckoutOpen} onOpenChange={setPathCheckoutOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>خرید کل مسیر آکادمی</DialogTitle>
              <DialogDescription>
                با خرید کل مسیر، به همهٔ کارگاه‌های موجود و آیندهٔ «{path.title}»
                دسترسی خواهید داشت.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/40 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">مسیر</span>
                  <span className="font-bold">{path.title}</span>
                </div>
                {activeDiscount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">قیمت اصلی</span>
                    <span className="line-through">{formatPrice(path.price)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border/70 pt-2 text-base font-extrabold">
                  <span>مبلغ نهایی</span>
                  <span className="text-primary">{formatPrice(effectivePrice)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  dir="ltr"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="کد تخفیف (اختیاری)"
                  className="text-center font-mono"
                />
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleBuyPath}
                disabled={buying}
              >
                {buying ? (
                  <Loader2 className="ml-2 size-4 animate-spin" />
                ) : null}
                {buying ? "در حال ثبت..." : `پرداخت ${formatPrice(effectivePrice)}`}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                دسترسی فوری پس از پرداخت فعال می‌شود
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PublicLayout>
  );
}

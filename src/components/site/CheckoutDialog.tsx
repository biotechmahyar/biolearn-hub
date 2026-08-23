import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { faNum, formatPrice } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, Loader2, ShieldCheck, Tag, X } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";

export type CheckoutItem = {
  type: "course" | "product" | "workshop";
  refId: string;
  title: string;
  price: number;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  items,
  successTitle = "خرید شما ثبت شد",
  successDescription = "دسترسی شما فعال شد؛ از پنل دانشجویی ادامه دهید.",
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CheckoutItem[];
  successTitle?: string;
  successDescription?: string;
  onSuccess?: (invoice: string) => void;
}) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const purchase = useMutation(api.enroll.purchase);

  const [coupon, setCoupon] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate against the actual coupons table so admin-created codes work.
  const couponInfo = useQuery(
    api.enroll.getCouponInfo,
    appliedCode ? { code: appliedCode } : "skip",
  );
  const couponPercent =
    appliedCode && couponInfo && couponInfo.valid ? couponInfo.percent : null;
  const couponError =
    appliedCode && couponInfo && !couponInfo.valid ? couponInfo.reason : null;

  const subtotal = items.reduce((acc, i) => acc + i.price, 0);
  const discount = subtotal > 0 && couponPercent ? Math.round((subtotal * couponPercent) / 100) : 0;
  const total = Math.max(0, subtotal - discount);
  const isFree = total === 0;

  const handleStart = () => {
    if (!isAuthenticated) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
  };

  const handleApplyCoupon = () => {
    if (!coupon.trim()) return;
    setAppliedCode(coupon.trim().toUpperCase());
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      handleStart();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const order = await purchase({
        items: items.map((i) => ({ type: i.type, refId: i.refId })),
        couponCode: coupon.trim() || undefined,
      });
      setDone(order?.invoiceNumber ?? "ZA-00000000");
      onSuccess?.(order?.invoiceNumber ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت سفارش");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDone(null);
    setCoupon("");
    setAppliedCode(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : handleClose())}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <BadgeCheck className="size-7" />
              </div>
              <DialogTitle className="text-xl">{successTitle}</DialogTitle>
              <DialogDescription className="pt-1 leading-6">
                {successDescription}
                <div className="mx-auto mt-3 w-fit rounded-lg bg-muted px-3 py-1.5 text-sm font-bold text-foreground">
                  شماره فاکتور: {faNum(done)}
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { handleClose(); navigate("/dashboard"); }}>
                رفتن به پنل دانشجویی
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { handleClose(); navigate("/courses"); }}>
                بازگشت به دوره‌ها
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="size-5 text-primary" />
                تکمیل خرید
              </DialogTitle>
              <DialogDescription>
                پرداخت در نسخهٔ اول به‌صورت آزمایشی ثبت می‌شود؛ درگاه رسمی به‌زودی متصل می‌شود.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/40 p-4">
              {items.map((item) => (
                <div key={`${item.type}-${item.refId}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="line-clamp-1 font-medium">{item.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {item.price === 0 ? "رایگان" : formatPrice(item.price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">جمع کل</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-500">
                  <span className="flex items-center gap-1">
                    <Tag className="size-3.5" />
                    تخفیف ({couponPercent}٪)
                  </span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border/70 pt-2 text-base font-extrabold">
                <span>مبلغ نهایی</span>
                <span>{isFree ? "رایگان" : formatPrice(total)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                dir="ltr"
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value.toUpperCase());
                  setAppliedCode(null);
                }}
                placeholder="کد تخفیف (مثل GEN10)"
                className="font-mono text-center"
              />
              <Button type="button" variant="outline" onClick={handleApplyCoupon}>
                اعمال
              </Button>
            </div>
            {couponError && <p className="text-xs text-destructive">{couponError}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 size-4 animate-spin" />
                  در حال ثبت...
                </>
              ) : isAuthenticated ? (
                isFree ? "ثبت‌نام رایگان" : `پرداخت ${formatPrice(total)}`
              ) : (
                "برای ادامه وارد شوید"
              )}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <X className="size-3.5" />
              درگاه پرداخت رسمی و فاکتور مالیاتی در فاز بعدی
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

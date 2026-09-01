import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { formatPriceNumber } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  Tag,
  Loader2,
  CheckCircle,
  Package,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CONDITION: Record<string, string> = {
  new: "نو",
  like_new: "تقریباً نو",
  used: "کارکرده",
};

export default function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("tabriz");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const cartItems = useQuery(api.marketplace.getCart);
  const wallet = useQuery(api.marketplace.getMyWallet);
  const updateItem = useMutation(api.marketplace.updateCartItem);
  const removeItem = useMutation(api.marketplace.removeFromCart);
  const checkout = useMutation(api.marketplace.checkoutCart);

  const subtotal = (cartItems ?? []).reduce(
    (sum, item) => sum + (item.product?.price ?? 0) * item.quantity,
    0,
  );
  const commission = Math.round(subtotal * 0.09);
  const total = subtotal;
  const hasEnoughBalance = (wallet?.balance ?? 0) >= total;
  const itemCount = (cartItems ?? []).reduce((sum, i) => sum + i.quantity, 0);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#071019] via-[#0a1520] to-[#071019]">
        <Card className="border-white/10 bg-white/[0.02] p-8 text-center">
          <ShoppingBag className="mx-auto mb-4 size-12 text-cyan-400/50" />
          <h2 className="text-xl font-bold text-white">سبد خرید</h2>
          <p className="mt-2 text-sm text-slate-400">
            برای مشاهده سبد خرید ابتدا وارد شوید
          </p>
          <Button onClick={() => navigate("/auth")} className="mt-4 bg-gradient-to-l from-cyan-500 to-cyan-600">
            ورود / عضویت
          </Button>
        </Card>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#071019] via-[#0a1520] to-[#071019]">
        <Card className="border-white/10 bg-white/[0.02] p-8 text-center">
          <CheckCircle className="mx-auto mb-4 size-16 text-emerald-400" />
          <h2 className="text-2xl font-bold text-white">سفارش ثبت شد!</h2>
          <p className="mt-2 text-sm text-slate-400">
            سفارش شما با موفقیت ثبت شد. فروشنده به زودی کالا را ارسال می‌کند.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button onClick={() => { setOrderComplete(false); navigate("/dashboard"); }} className="bg-gradient-to-l from-cyan-500 to-cyan-600">
              پنل خریداری
            </Button>
            <Button variant="outline" onClick={() => navigate("/marketplace")} className="border-white/10 text-slate-300">
              بازارچه
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const items = cartItems ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071019] via-[#0a1520] to-[#071019] text-slate-200" dir="rtl">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400">
            <ArrowRight className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-white">سبد خرید</h1>
            <p className="text-sm text-slate-400">{itemCount} محصول</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="mb-4 size-16 text-slate-600" />
            <h2 className="text-xl font-bold text-slate-300">سبد خرید خالی است</h2>
            <p className="mt-2 text-sm text-slate-500">محصولات بازارچه را مشاهده کنید</p>
            <Button onClick={() => navigate("/marketplace")} className="mt-4 bg-gradient-to-l from-cyan-500 to-cyan-600">
              رفتن به بازارچه
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Cart Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item._id} className="border-white/10 bg-white/[0.02] transition-all hover:border-white/15">
                  <CardContent className="flex gap-4 p-4">
                    {/* Cover image */}
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                      {item.product?.coverImage ? (
                        <img src={item.product.coverImage} alt={item.product.title} className="size-full object-cover" />
                      ) : (
                        <Package className="size-8 text-slate-600" />
                      )}
                    </div>

                    <div className="flex flex-1 flex-col min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-white">{item.product?.title}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">فروشنده: {item.sellerName}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-slate-500 hover:text-red-400"
                          onClick={async () => {
                            try {
                              await removeItem({ cartItemId: item._id });
                              toast.success("حذف شد");
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px] bg-white/5 text-slate-400">
                            {CONDITION[item.product?.condition ?? "new"]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg border border-white/10">
                            <button
                              className="px-2 py-1 text-slate-400 hover:text-white"
                              onClick={async () => {
                                if (item.quantity <= 1) {
                                  await removeItem({ cartItemId: item._id });
                                } else {
                                  await updateItem({ cartItemId: item._id, quantity: item.quantity - 1 });
                                }
                              }}
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="min-w-[32px] text-center text-xs font-bold text-white">{item.quantity}</span>
                            <button
                              className="px-2 py-1 text-slate-400 hover:text-white"
                              onClick={async () => {
                                if (item.quantity < (item.product?.stock ?? 0)) {
                                  await updateItem({ cartItemId: item._id, quantity: item.quantity + 1 });
                                }
                              }}
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-cyan-300">
                            {formatPriceNumber((item.product?.price ?? 0) * item.quantity)} ت
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:sticky lg:top-24 lg:h-fit">
              <Card className="border-white/10 bg-white/[0.02]">
                <CardContent className="space-y-4 p-5">
                  <h3 className="text-sm font-bold text-white">خلاصه سفارش</h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>جمع ({itemCount} محصول)</span>
                      <span>{formatPriceNumber(subtotal)} تومان</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>کارمزد سایت (۹٪)</span>
                      <span>{formatPriceNumber(commission)} تومان</span>
                    </div>
                    <div className="border-t border-white/10 pt-2">
                      <div className="flex justify-between font-bold text-white">
                        <span>مبلغ قابل پرداخت</span>
                        <span className="text-cyan-300">{formatPriceNumber(total)} تومان</span>
                      </div>
                    </div>
                  </div>

                  {/* Wallet balance */}
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs">
                    <span className="text-slate-400">موجودی کیف پول</span>
                    <span className={hasEnoughBalance ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {formatPriceNumber(wallet?.balance ?? 0)} تومان
                    </span>
                  </div>

                  {!hasEnoughBalance && (
                    <p className="text-xs text-amber-400">
                      موجودی کیف پول برای پرداخت کافی نیست. لطفاً ابتدا کیف پول را شارژ کنید.
                    </p>
                  )}

                  {/* Coupon */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="کد تخفیف"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="h-9 border-white/10 bg-white/5 text-xs text-slate-100 placeholder:text-slate-500"
                    />
                    <Button variant="outline" size="sm" className="h-9 border-white/10 text-slate-300">
                      <Tag className="ml-1 size-3" />
                      اعمال
                    </Button>
                  </div>

                  {/* Checkout button */}
                  <Button
                    className="w-full bg-gradient-to-l from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500"
                    disabled={!hasEnoughBalance || checkingOut}
                    onClick={() => setShowCheckout(true)}
                  >
                    <ShoppingBag className="ml-2 size-4" />
                    تکمیل خرید
                  </Button>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 justify-center">
                    <Truck className="size-3" />
                    <span>ارسال فقط در تبریز</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="border-white/10 bg-[#0b1a2a] text-white max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تکمیل خرید</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-400">آدرس تحویل</label>
              <Textarea
                placeholder="آدرس دقیق در تبریز..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="min-h-[60px] border-white/10 bg-white/5 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-400">توضیحات ارسال</label>
              <Input
                placeholder="مثلاً: پلاک ۵، واحد ۲"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                className="h-9 border-white/10 bg-white/5 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
              <span>مبلغ نهایی</span>
              <span className="text-cyan-300">{formatPriceNumber(total)} تومان</span>
            </div>

            <Button
              className="w-full bg-gradient-to-l from-cyan-500 to-cyan-600 text-white"
              disabled={checkingOut || !hasEnoughBalance}
              onClick={async () => {
                setCheckingOut(true);
                try {
                  await checkout({
                    deliveryCity,
                    deliveryAddress: deliveryAddress || undefined,
                    deliveryNote: deliveryNote || undefined,
                    couponCode: couponCode || undefined,
                  });
                  setOrderComplete(true);
                  setShowCheckout(false);
                  toast.success("سفارش با موفقیت ثبت شد!");
                } catch (e: any) {
                  toast.error(e.message);
                } finally {
                  setCheckingOut(false);
                }
              }}
            >
              {checkingOut ? <Loader2 className="ml-2 size-4 animate-spin" /> : <CheckCircle className="ml-2 size-4" />}
              {checkingOut ? "در حال ثبت..." : "پرداخت با کیف پول"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

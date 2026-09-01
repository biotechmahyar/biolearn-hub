import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, Link, useNavigate } from "react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { formatPriceNumber } from "@/lib/format";
import {
  Star,
  ArrowRight,
  ShoppingBag,
  MapPin,
  Truck,
  Shield,
  Store,
  Minus,
  Plus,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CONDITION_LABELS: Record<string, string> = {
  new: "نو",
  like_new: "تقریباً نو",
  used: "کارکرده",
};

const CONDITION_COLORS: Record<string, string> = {
  new: "bg-emerald-500/15 text-emerald-300",
  like_new: "bg-cyan-500/15 text-cyan-300",
  used: "bg-amber-500/15 text-amber-300",
};

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [showPurchase, setShowPurchase] = useState(false);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  const product = useQuery(api.marketplace.getProduct, { slug: slug ?? "" });
  const wallet = useQuery(api.marketplace.getMyWallet);
  const purchase = useMutation(api.marketplace.purchaseProduct);

  if (product === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071019]">
        <div className="size-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071019] text-slate-200" dir="rtl">
        <div className="text-center">
          <ShoppingBag className="mx-auto size-12 text-slate-600" />
          <p className="mt-4 text-sm text-slate-400">محصول یافت نشد.</p>
          <Link to="/marketplace">
            <Button variant="ghost" size="sm" className="mt-4 text-cyan-300">
              <ArrowRight className="ml-2 size-4" />
              بازگشت به بازارچه
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?._id === product.sellerId;

  const handlePurchase = async () => {
    if (!user) {
      navigate("/auth?returnTo=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (isOwner) {
      toast.error("نمی‌توانید محصول خودتان را بخرید.");
      return;
    }
    if (product.stock < quantity) {
      toast.error("موجودی کافی نیست.");
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchase({
        productId: product._id as any,
        quantity,
        deliveryCity: "tabriz",
        deliveryAddress: address || undefined,
        deliveryNote: note || undefined,
        payWithWallet: true,
      });
      if (result.ok) {
        toast.success("خرید با موفقیت ثبت شد! 🎉");
        setShowPurchase(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در خرید");
    } finally {
      setPurchasing(false);
    }
  };

  const hasStock = product.stock > 0;
  const canBuy = user && !isOwner && hasStock;
  const hasEnoughBalance = (wallet?.balance ?? 0) >= product.price * quantity;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071019] via-[#0a1520] to-[#071019] text-slate-200" dir="rtl">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link to="/marketplace" className="hover:text-cyan-300">بازارچه</Link>
          <ChevronLeft className="size-3" />
          <span className="text-slate-300">{product.title}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Images */}
            {product.images.length > 0 ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/5">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="size-full object-cover"
                />
                {product.boostLevel !== "none" && (product.boostExpiresAt ?? 0) > Date.now() && (
                  <Badge className="absolute left-4 top-4 border-0 bg-amber-500/90 text-[10px] text-white shadow-lg">
                    ⚡ آگهی ویژه
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-white/5">
                <ShoppingBag className="size-16 text-slate-700" />
              </div>
            )}

            {/* Title & Info */}
            <div>
              <h1 className="text-xl font-extrabold text-white sm:text-2xl">{product.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className={cn("border-0 text-[10px]", CONDITION_COLORS[product.condition])}>
                  {CONDITION_LABELS[product.condition]}
                </Badge>
                <Badge variant="outline" className="border-white/10 text-[10px] text-slate-400">
                  موجودی: {product.stock}
                </Badge>
                {product.soldCount > 0 && (
                  <Badge variant="outline" className="border-white/10 text-[10px] text-slate-400">
                    {product.soldCount} فروش
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <h3 className="mb-3 text-sm font-bold text-white">توضیحات</h3>
              <p className="text-sm leading-7 text-slate-400 whitespace-pre-wrap">{product.description}</p>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="border-white/10 text-[10px] text-slate-400">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Reviews */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">
                نظرات خریداران ({product.reviews?.length ?? 0})
              </h3>
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((review: any) => (
                  <Card key={review._id} className="border-white/5 bg-white/[0.02]">
                    <CardContent className="py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{review.userName}</span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "size-3",
                                i < review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-600",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {review.text && <p className="text-xs text-slate-400">{review.text}</p>}
                      <p className="mt-1 text-[10px] text-slate-600">
                        {new Date(review.createdAt).toLocaleDateString("fa-IR")}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-slate-500">هنوز نظری ثبت نشده است.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Price & Buy Card */}
            <Card className="sticky top-24 border-white/10 bg-[#0a1520]">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-3xl font-extrabold text-white">
                    {formatPriceNumber(product.price)}
                    <span className="mr-1 text-sm font-normal text-slate-400">تومان</span>
                  </p>
                </div>

                {/* Delivery info */}
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-cyan-400" />
                    <span>ارسال به تبریز</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="size-3.5 text-emerald-400" />
                    <span>ارسال پس از تأیید سفارش</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="size-3.5 text-amber-400" />
                    <span>ضمانت بازگشت وجه</span>
                  </div>
                </div>

                {canBuy ? (
                  !showPurchase ? (
                    <Button
                      className="w-full bg-gradient-to-l from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500 shadow-lg shadow-cyan-500/20"
                      onClick={() => setShowPurchase(true)}
                    >
                      <ShoppingBag className="ml-2 size-4" />
                      خرید آنلاین
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      {/* Quantity */}
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="text-lg font-bold text-white">{quantity}</span>
                        <button
                          onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                          className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>

                      <div className="rounded-lg bg-white/5 p-3 text-sm">
                        <div className="flex justify-between text-slate-300">
                          <span>قیمت واحد</span>
                          <span>{formatPriceNumber(product.price)} تومان</span>
                        </div>
                        <div className="mt-1 flex justify-between font-bold text-white">
                          <span>جمع کل</span>
                          <span>{formatPriceNumber(product.price * quantity)} تومان</span>
                        </div>
                      </div>

                      <Input
                        placeholder="آدرس تحویل (تبریز)"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="border-white/10 bg-white/5 text-sm text-slate-100"
                      />
                      <Textarea
                        placeholder="توضیحات ارسال (اختیاری)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="min-h-[60px] border-white/10 bg-white/5 text-sm text-slate-100"
                      />

                      {!hasEnoughBalance && (
                        <p className="text-xs text-amber-400">
                          موجودی کیف پول: {formatPriceNumber(wallet?.balance ?? 0)} تومان
                          (کافی نیست)
                        </p>
                      )}

                      <Button
                        className="w-full bg-gradient-to-l from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500"
                        disabled={purchasing || !hasEnoughBalance}
                        onClick={handlePurchase}
                      >
                        {purchasing
                          ? "در حال ثبت..."
                          : `پرداخت ${formatPriceNumber(product.price * quantity)} تومان`}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-slate-400"
                        onClick={() => setShowPurchase(false)}
                      >
                        انصراف
                      </Button>
                    </div>
                  )
                ) : !user ? (
                  <Link to={'/auth?returnTo=' + encodeURIComponent(window.location.pathname)}>
                    <Button className="w-full bg-gradient-to-l from-cyan-500 to-cyan-600 text-white">
                      برای خرید وارد شوید
                    </Button>
                  </Link>
                ) : isOwner ? (
                  <Badge className="w-full justify-center bg-white/10 py-2 text-xs text-slate-300">
                    محصول شما
                  </Badge>
                ) : (
                  <Badge className="w-full justify-center bg-red-500/10 py-2 text-xs text-red-300">
                    ناموجود
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-cyan-400/10">
                    <Store className="size-5 text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{product.sellerName}</p>
                    <p className="text-[10px] text-slate-500">فروشنده</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

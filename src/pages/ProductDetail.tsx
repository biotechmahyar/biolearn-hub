import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMode } from "@/hooks/useMode";
import { useApiQuery, useApiMutation } from "@/hooks/useApiQuery";
import { api as iranApi } from "@/lib/apiClient";
import { useMemo, Component, type ReactNode } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { addToRecentlyViewed } from "@/lib/recentlyViewed";
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

/* ─── Error Boundary ─── */
interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: string | null; }

class ProductErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#071019] text-slate-200" dir="rtl">
          <div className="text-center max-w-md px-4">
            <ShoppingBag className="mx-auto size-12 text-red-400" />
            <p className="mt-4 text-sm text-red-300 font-bold">خطا در نمایش محصول</p>
            <p className="mt-2 text-xs text-slate-500">{this.state.error}</p>
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
    return this.props.children;
  }
}

/* ─── Constants ─── */
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

/* ─── Helpers ─── */
function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}
function safeNum(val: unknown, fallback = 0): number {
  return typeof val === "number" && !isNaN(val) ? val : fallback;
}
function safeArr<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

/* ─── Inner Component ─── */
function ProductDetailInner() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [showPurchase, setShowPurchase] = useState(false);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [payMethod, setPayMethod] = useState<"wallet" | "online" | "offline">("wallet");

  const { isIran } = useMode();
  const productConvex = useQuery(api.marketplace.getProduct, { slug: slug ?? "" });
  const walletConvex = useQuery(api.marketplace.getMyWallet);
  const purchaseConvex = useMutation(api.marketplace.purchaseProduct);
  const toggleWishlistConvex = useMutation(api.marketplace.toggleWishlist);
  const addToCartConvex = useMutation(api.marketplace.addToCart);
  const isWishlistedConvex = useQuery(
    api.marketplace.isWishlisted,
    productConvex ? { productId: productConvex._id as any } : "skip",
  );

  // Iran server
  const { data: productIran } = useApiQuery<any>(isIran && slug ? `/api/marketplace/products/${slug}` : "");
  const { data: walletIran } = useApiQuery<any>(isIran ? "/api/wallet" : "");
  const { mutate: purchaseIran } = useApiMutation("/api/marketplace/checkout", "POST");
  const { mutate: addToCartIran } = useApiMutation("/api/marketplace/cart", "POST");
  const { mutate: toggleWishlistIran } = useApiMutation("/api/marketplace/wishlist", "POST");

  const product = useMemo(() => {
    if (isIran && productIran) return { ...productIran, _id: productIran.id };
    return productConvex;
  }, [isIran, productIran, productConvex]);

  const wallet = isIran ? walletIran : walletConvex;
  const isWishlisted = isIran ? false : isWishlistedConvex;
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const submitReview = useMutation(api.marketplace.addReview);
  const similarProducts = useQuery(
    api.marketplace.getSimilarProducts,
    product ? { productId: product._id as any, limit: 4 } : "skip",
  );

  // Track recently viewed — MUST be before any early return to satisfy Rules of Hooks
  useEffect(() => {
    if (product && safeStr((product as any).status) === "approved") {
      addToRecentlyViewed({
        slug: safeStr(product.slug),
        title: safeStr(product.title, "محصول"),
        price: safeNum(product.price),
        coverImage: safeStr(product.coverImage) || undefined,
        category: safeStr((product as any).category),
      });
    }
  }, [product?.slug]);

  /* ── Loading ── */
  if (product === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071019]">
        <div className="size-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  /* ── Not found ── */
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

  // Normalize all product fields defensively
  const pTitle = safeStr(product.title, "محصول");
  const pDescription = safeStr(product.description);
  const pSlug = safeStr(product.slug);
  const pPrice = safeNum(product.price);
  const pStock = safeNum(product.stock);
  const pSoldCount = safeNum(product.soldCount);
  const pCondition = safeStr(product.condition);
  const pBoostLevel = safeStr(product.boostLevel, "none");
  const pBoostExpiresAt = safeNum(product.boostExpiresAt);
  const pCoverImage = safeStr(product.coverImage);
  const pImages = safeArr<string>(product.images);
  const pTags = safeArr<string>(product.tags);
  const pReviews = safeArr<any>(product.reviews);
  const pSellerName = safeStr((product as any).sellerName, "ناشناس");
  const pSellerId = (product as any).sellerId;
  const pStatus = safeStr((product as any).status);
  const pId = (product as any)._id;

  const isOwner = user?._id === pSellerId;

  const handlePurchase = async () => {
    if (!user) {
      navigate("/auth?returnTo=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (isOwner) {
      toast.error("نمی\u200cتوانید محصول خودتان را بخرید.");
      return;
    }
    if (pStock < quantity) {
      toast.error("موجودی کافی نیست.");
      return;
    }

    setPurchasing(true);
    try {
      if (isIran) {
        const res = await iranApi.post("/api/marketplace/checkout", {
          deliveryCity: "tabriz",
          deliveryAddress: address || undefined,
          deliveryNote: note || undefined,
        });
        if (res.ok) {
          toast.success("خرید با موفقیت ثبت شد!");
          setShowPurchase(false);
        } else {
          throw new Error(res.error || "خطا در خرید");
        }
      } else {
        const result = await purchaseConvex({
          productId: pId,
          quantity,
          deliveryCity: "tabriz",
          deliveryAddress: address || undefined,
          deliveryNote: note || undefined,
          payWithWallet: payMethod === "wallet",
          payMethod,
        });
        if (result.ok) {
          toast.success("خرید با موفقیت ثبت شد!");
          setShowPurchase(false);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در خرید");
    } finally {
      setPurchasing(false);
    }
  };

  const hasStock = pStock > 0;
  const canBuy = user && !isOwner && hasStock;
  const hasEnoughBalance = (wallet?.balance ?? 0) >= pPrice * quantity;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071019] via-[#0a1520] to-[#071019] text-slate-200" dir="rtl">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link to="/marketplace" className="hover:text-cyan-300">بازارچه</Link>
          <ChevronLeft className="size-3" />
          <span className="text-slate-300">{pTitle}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Images */}
            {pImages.length > 0 ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/5">
                <img
                  src={pImages[0]}
                  alt={pTitle}
                  className="size-full object-cover"
                />
                {pBoostLevel !== "none" && pBoostExpiresAt > Date.now() && (
                  <Badge className="absolute left-4 top-4 border-0 bg-amber-500/90 text-[10px] text-white shadow-lg">
                    ⚡ آگهی ویژه
                  </Badge>
                )}
              </div>
            ) : pCoverImage ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/5">
                <img
                  src={pCoverImage}
                  alt={pTitle}
                  className="size-full object-cover"
                />
                {pBoostLevel !== "none" && pBoostExpiresAt > Date.now() && (
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
              <h1 className="text-xl font-extrabold text-white sm:text-2xl">{pTitle}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {pCondition && CONDITION_LABELS[pCondition] && (
                  <Badge className={cn("border-0 text-[10px]", CONDITION_COLORS[pCondition])}>
                    {CONDITION_LABELS[pCondition]}
                  </Badge>
                )}
                <Badge variant="outline" className="border-white/10 text-[10px] text-slate-400">
                  موجودی: {pStock}
                </Badge>
                {pSoldCount > 0 && (
                  <Badge variant="outline" className="border-white/10 text-[10px] text-slate-400">
                    {pSoldCount} فروش
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {pDescription && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <h3 className="mb-3 text-sm font-bold text-white">توضیحات</h3>
                <p className="text-sm leading-7 text-slate-400 whitespace-pre-wrap">{pDescription}</p>
              </div>
            )}

            {/* Tags */}
            {pTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pTags.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="border-white/10 text-[10px] text-slate-400">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Reviews */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">
                نظرات خریداران ({pReviews.length})
              </h3>

              {/* Review Form */}
              {user && !isOwner && (
                <Card className="border-white/10 bg-white/[0.02]">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-400">نظر شما</p>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((s) => (
                        <button key={s} onClick={() => setReviewRating(s)}>
                          <Star className={cn("size-5 cursor-pointer", s <= reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-600")} />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="نظر خود را بنویسید..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="min-h-[60px] border-white/10 bg-white/5 text-sm text-slate-100"
                    />
                    <Button
                      size="sm"
                      disabled={reviewing}
                      onClick={async () => {
                        setReviewing(true);
                        try {
                          await submitReview({
                            productId: pId,
                            rating: reviewRating,
                            text: reviewText || undefined,
                          });
                          toast.success("نظر شما ثبت شد");
                          setReviewText("");
                          setReviewRating(5);
                        } catch (e: any) {
                          toast.error(e.message);
                        } finally {
                          setReviewing(false);
                        }
                      }}
                    >
                      ارسال نظر
                    </Button>
                  </CardContent>
                </Card>
              )}
              {pReviews.length > 0 ? (
                pReviews.map((review: any) => (
                  <Card key={review._id} className="border-white/5 bg-white/[0.02]">
                    <CardContent className="py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{safeStr(review.userName, "ناشناس")}</span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "size-3",
                                i < safeNum(review.rating)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-600",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {review.text && typeof review.text === "string" && <p className="text-xs text-slate-400">{review.text}</p>}
                      <p className="mt-1 text-[10px] text-slate-600">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString("fa-IR") : ""}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-slate-500">هنوز نظری ثبت نشده است.</p>
              )}
            </div>

            {/* Similar Products */}
            {safeArr(similarProducts).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white">محصولات مشابه</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {safeArr<any>(similarProducts).map((sp: any) => (
                    <Link key={sp._id} to={`/marketplace/${safeStr(sp.slug, "")}`}>
                      <Card className="group overflow-hidden border-white/5 bg-white/[0.02] transition-all hover:-translate-y-0.5 hover:border-cyan-400/20">
                        <div className="relative aspect-square overflow-hidden bg-white/5">
                          {sp.coverImage ? (
                            <img src={sp.coverImage} alt={safeStr(sp.title)} className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <ShoppingBag className="size-8 text-slate-700" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="line-clamp-2 text-xs font-bold text-white group-hover:text-cyan-200">{safeStr(sp.title)}</h4>
                          <p className="mt-1 text-sm font-extrabold text-cyan-300">{formatPriceNumber(safeNum(sp.price))} <span className="text-[10px] font-normal text-slate-500">ت</span></p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Price & Buy Card */}
            <Card className="sticky top-24 border-white/10 bg-[#0a1520]">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-3xl font-extrabold text-white">
                    {formatPriceNumber(pPrice)}
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
                    <div className="space-y-2">
                      <Button
                        className="w-full bg-gradient-to-l from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500 shadow-lg shadow-cyan-500/20"
                        onClick={() => setShowPurchase(true)}
                      >
                        <ShoppingBag className="ml-2 size-4" />
                        خرید آنلاین
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        onClick={async () => {
                          try {
                            if (isIran) {
                              await addToCartIran({ productId: pId, quantity: 1 });
                            } else {
                              await addToCartConvex({ productId: pId, quantity: 1 });
                            }
                            toast.success("به سبد خرید اضافه شد");
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                      >
                        <ShoppingBag className="ml-2 size-4" />
                        افزودن به سبد
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-slate-400 hover:text-pink-400"
                        onClick={async () => {
                          if (!user) { navigate("/auth"); return; }
                          try {
                            let res: any;
                            if (isIran) {
                              res = await iranApi.post("/api/marketplace/wishlist", { productId: pId });
                              res = res.ok ? res.data : { wishlisted: false };
                            } else {
                              res = await toggleWishlistConvex({ productId: pId });
                            }
                            toast.success(res.wishlisted ? "به علاقه\u200cمندی\u200cها اضافه شد" : "از علاقه\u200cمندی\u200cها حذف شد");
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                      >
                        {isWishlisted ? "❤️ حذف از علاقه\u200cمندی\u200cها" : "🤍 افزودن به علاقه\u200cمندی\u200cها"}
                      </Button>
                    </div>
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
                          onClick={() => setQuantity(Math.min(pStock, quantity + 1))}
                          className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>

                      <div className="rounded-lg bg-white/5 p-3 text-sm">
                        <div className="flex justify-between text-slate-300">
                          <span>قیمت واحد</span>
                          <span>{formatPriceNumber(pPrice)} تومان</span>
                        </div>
                        <div className="mt-1 flex justify-between font-bold text-white">
                          <span>جمع کل</span>
                          <span>{formatPriceNumber(pPrice * quantity)} تومان</span>
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

                      {/* Payment method selection */}
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400">روش پرداخت:</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPayMethod("wallet")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                              payMethod === "wallet"
                                ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                                : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                            }`}
                          >
                            کیف پول
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayMethod("online")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                              payMethod === "online"
                                ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                                : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                            }`}
                          >
                            پرداخت آنلاین
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayMethod("offline")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                              payMethod === "offline"
                                ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                                : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                            }`}
                          >
                            پرداخت آفلاین
                          </button>
                        </div>
                      </div>

                      {payMethod === "wallet" && !hasEnoughBalance && (
                        <p className="text-xs text-amber-400">
                          موجودی کیف پول: {formatPriceNumber(wallet?.balance ?? 0)} تومان
                          (کافی نیست)
                        </p>
                      )}

                      {payMethod === "offline" && (
                        <p className="text-xs text-slate-400">
                          پس از ثبت سفارش، مبلغ را به کارت بانکی واریز کرده و شماره پیگیری را ارسال کنید.
                        </p>
                      )}

                      <Button
                        className="w-full bg-gradient-to-l from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500"
                        disabled={purchasing || (payMethod === "wallet" && !hasEnoughBalance)}
                        onClick={handlePurchase}
                      >
                        {purchasing
                          ? "در حال ثبت..."
                          : payMethod === "offline"
                            ? `ثبت سفارش (${formatPriceNumber(pPrice * quantity)} تومان)`
                            : `پرداخت ${formatPriceNumber(pPrice * quantity)} تومان`}
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
                  <Link to={"/auth?returnTo=" + encodeURIComponent(window.location.pathname)}>
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
                    <p className="text-sm font-medium text-white">{pSellerName}</p>
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

/* ─── Exported with Error Boundary ─── */
export default function ProductDetail() {
  return (
    <ProductErrorBoundary>
      <ProductDetailInner />
    </ProductErrorBoundary>
  );
}

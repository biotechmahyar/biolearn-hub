import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMode } from "@/hooks/useMode";
import { formatPriceNumber } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import {
  Package,
  ShoppingBag,
  Wallet,
  Tag,
  BarChart3,
  CheckCircle,
  XCircle,
  Eye,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Search,
  Filter,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Star,
  Flame,
  AlertCircle,
  FileText,
  MessageSquare,
  Truck,
  CheckSquare,
  XSquare,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "پیش‌نویس", color: "bg-slate-500/15 text-slate-300", icon: FileText },
  pending: { label: "در انتظار تأیید", color: "bg-amber-500/15 text-amber-300", icon: Clock },
  approved: { label: "منتشر شده", color: "bg-emerald-500/15 text-emerald-300", icon: CheckCircle },
  rejected: { label: "رد شده", color: "bg-red-500/15 text-red-300", icon: XCircle },
  sold_out: { label: "ناموجود", color: "bg-slate-500/15 text-slate-300", icon: Package },
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "در انتظار پرداخت", color: "bg-amber-500/15 text-amber-300" },
  paid: { label: "پرداخت شده", color: "bg-cyan-500/15 text-cyan-300" },
  shipped: { label: "ارسال شده", color: "bg-blue-500/15 text-blue-300" },
  delivered: { label: "تحویل شده", color: "bg-purple-500/15 text-purple-300" },
  completed: { label: "تکمیل شده", color: "bg-emerald-500/15 text-emerald-300" },
  cancelled: { label: "لغو شده", color: "bg-red-500/15 text-red-300" },
  refunded: { label: "بازپرداخت شده", color: "bg-orange-500/15 text-orange-300" },
};

export default function AdminMarketplacePanel() {
  const { isIran } = useMode();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showProductDetail, setShowProductDetail] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponPercent, setCouponPercent] = useState(10);
  const [couponMaxDiscount, setCouponMaxDiscount] = useState(50000);
  const [couponMinPurchase, setCouponMinPurchase] = useState(10000);
  const [couponMaxUses, setCouponMaxUses] = useState(100);

  // Queries
  const allProducts = useQuery(api.marketplace.adminListAllProducts, { status: statusFilter ?? undefined });
  const walletData = useQuery(api.marketplace.adminGetUserWallet, user?._id ? { userId: user._id } : "skip");

  const approveProduct = useMutation(api.marketplace.adminReviewProduct);
  const deleteProduct = useMutation(api.marketplace.deleteProduct);

  const isStaff = user?.role === "admin" || user?.role === "site_admin";

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#071019] to-[#0a1520]">
        <Card className="border-white/10 bg-white/[0.02] p-8 text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-red-400" />
          <h2 className="text-xl font-bold text-white">دسترسی غیرمجاز</h2>
          <p className="mt-2 text-sm text-slate-400">فقط مدیران سایت به این بخش دسترسی دارند.</p>
        </Card>
      </div>
    );
  }

  // Stats
  const products = allProducts ?? [];
  const pendingCount = products.filter((p) => p.status === "pending").length;
  const approvedCount = products.filter((p) => p.status === "approved").length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.soldCount), 0);

  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return p.title.toLowerCase().includes(s) || p.sellerName?.toLowerCase().includes(s);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071019] via-[#0a1520] to-[#071019] text-slate-200" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white">مدیریت بازارچه</h1>
            <p className="mt-1 text-sm text-slate-400">مدیریت محصولات، سفارشات و مالی بازارچه</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-white/10 bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">کل محصولات</p>
                  <p className="mt-1 text-2xl font-extrabold text-white">{products.length}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/10">
                  <Package className="size-5 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">در انتظار تأیید</p>
                  <p className="mt-1 text-2xl font-extrabold text-amber-300">{pendingCount}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/10">
                  <Clock className="size-5 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">محصولات فعال</p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-300">{approvedCount}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/10">
                  <CheckCircle className="size-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">ارزش فروش کل</p>
                  <p className="mt-1 text-lg font-extrabold text-white">{formatPriceNumber(totalValue)}</p>
                  <p className="text-[10px] text-slate-500">تومان</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-400/10">
                  <DollarSign className="size-5 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 bg-white/5">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">
              <BarChart3 className="ml-2 size-4" />
              نمای کلی
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-white/10">
              <Package className="ml-2 size-4" />
              محصولات
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-amber-500/90 text-[9px] text-white">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="coupons" className="data-[state=active]:bg-white/10">
              <Tag className="ml-2 size-4" />
              کوپن‌ها
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Recent pending products */}
              <Card className="border-white/10 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-sm">محصولات در انتظار تأیید</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {products.filter((p) => p.status === "pending").slice(0, 5).map((p) => (
                    <div key={p._id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{p.title}</p>
                        <p className="text-[10px] text-slate-500">{p.sellerName} · {formatPriceNumber(p.price)} ت</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-7 text-emerald-400 hover:text-emerald-300"
                          onClick={async () => {
                            await approveProduct({ productId: p._id, status: "approved" });
                            toast.success("تأیید شد");
                          }}
                        >
                          <CheckCircle className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-7 text-red-400 hover:text-red-300"
                          onClick={async () => {
                            await approveProduct({ productId: p._id, status: "rejected", rejectionReason: "تأیید نشد" });
                            toast.success("رد شد");
                          }}
                        >
                          <XCircle className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {products.filter((p) => p.status === "pending").length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-500">محصولی در انتظار تأیید نیست</p>
                  )}
                </CardContent>
              </Card>

              {/* Top selling products */}
              <Card className="border-white/10 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-sm">پرفروش‌ترین محصولات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {products
                    .filter((p) => p.status === "approved")
                    .sort((a, b) => b.soldCount - a.soldCount)
                    .slice(0, 5)
                    .map((p) => (
                      <div key={p._id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{p.title}</p>
                          <p className="text-[10px] text-slate-500">{p.sellerName}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-emerald-300">{p.soldCount} فروش</p>
                          <p className="text-[10px] text-slate-500">{formatPriceNumber(p.price)} ت</p>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Boosted products */}
              <Card className="border-white/10 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-sm">آگهی‌های ویژه فعال</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {products
                    .filter((p) => p.boostLevel !== "none" && (p.boostExpiresAt ?? 0) > Date.now())
                    .slice(0, 5)
                    .map((p) => (
                      <div key={p._id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{p.title}</p>
                          <p className="text-[10px] text-slate-500">{p.sellerName}</p>
                        </div>
                        <Badge className={cn("border-0 text-[9px]", p.boostLevel === "gold" ? "bg-amber-500/20 text-amber-300" : "bg-slate-400/20 text-slate-300")}>
                          <Flame className="ml-1 size-2.5" />
                          {p.boostLevel === "gold" ? "طلایی" : "نقره‌ای"}
                        </Badge>
                      </div>
                    ))}
                  {products.filter((p) => p.boostLevel !== "none" && (p.boostExpiresAt ?? 0) > Date.now()).length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-500">آگهی ویژه فعالی نیست</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-white/10 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-sm">عملیات سریع</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    onClick={() => setTab("products")}
                  >
                    <Package className="ml-2 size-4" />
                    مدیریت محصولات ({pendingCount} در انتظار)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    onClick={() => setTab("coupons")}
                  >
                    <Tag className="ml-2 size-4" />
                    ایجاد کوپن تخفیف
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="border-white/10 bg-white/[0.02]">
              <CardContent className="p-4">
                {/* Filters */}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      placeholder="جستجو در محصولات..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 border-white/10 bg-white/5 pr-10 text-sm text-slate-100"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["pending", "approved", "rejected", "sold_out"].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={statusFilter === s ? "default" : "outline"}
                        className={cn(
                          "h-8 text-xs",
                          statusFilter === s ? "bg-cyan-600 text-white" : "border-white/10 bg-white/5 text-slate-400",
                        )}
                        onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                      >
                        {STATUS_MAP[s]?.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Products list */}
                <div className="space-y-2">
                  {filteredProducts.map((p) => {
                    const StatusIcon = STATUS_MAP[p.status]?.icon ?? Package;
                    return (
                      <div
                        key={p._id}
                        className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:border-white/10"
                      >
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                          {p.coverImage ? (
                            <img src={p.coverImage} alt={p.title} className="size-full object-cover" />
                          ) : (
                            <Package className="size-5 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-bold text-white">{p.title}</h3>
                            <Badge className={cn("border-0 text-[9px]", STATUS_MAP[p.status]?.color)}>
                              <StatusIcon className="ml-1 size-2.5" />
                              {STATUS_MAP[p.status]?.label}
                            </Badge>
                            {p.boostLevel !== "none" && (p.boostExpiresAt ?? 0) > Date.now() && (
                              <Badge className="border-0 bg-amber-500/15 text-[9px] text-amber-300">
                                <Flame className="ml-1 size-2" /> ویژه
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                            <span>{p.sellerName}</span>
                            <span>·</span>
                            <span>{formatPriceNumber(p.price)} تومان</span>
                            <span>·</span>
                            <span>{p.soldCount} فروش</span>
                            {p.ratingCount > 0 && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5">
                                  <Star className="size-2.5 fill-amber-400 text-amber-400" />
                                  {p.rating}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {p.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="size-8 text-emerald-400 hover:text-emerald-300"
                                onClick={async () => {
                                  await approveProduct({ productId: p._id, status: "approved" });
                                  toast.success("تأیید شد ✓");
                                }}
                              >
                                <CheckCircle className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="size-8 text-red-400 hover:text-red-300"
                                onClick={async () => {
                                  await approveProduct({ productId: p._id, status: "rejected", rejectionReason: rejectReason || "تأیید نشد" });
                                  toast.success("رد شد");
                                }}
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-8 text-slate-400 hover:text-white"
                            onClick={() => setShowProductDetail(p)}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            <Card className="border-white/10 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-sm">ایجاد کوپن تخفیف بازارچه</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">کد تخفیف</label>
                    <Input
                      placeholder="مثلاً: BIO2026"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="border-white/10 bg-white/5 text-sm text-slate-100 uppercase"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">درصد تخفیف</label>
                    <Input
                      type="number"
                      value={couponPercent}
                      onChange={(e) => setCouponPercent(Number(e.target.value))}
                      className="border-white/10 bg-white/5 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">حداکثر تخفیف (تومان)</label>
                    <Input
                      type="number"
                      value={couponMaxDiscount}
                      onChange={(e) => setCouponMaxDiscount(Number(e.target.value))}
                      className="border-white/10 bg-white/5 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">حداقل خرید (تومان)</label>
                    <Input
                      type="number"
                      value={couponMinPurchase}
                      onChange={(e) => setCouponMinPurchase(Number(e.target.value))}
                      className="border-white/10 bg-white/5 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-400">حداکثر استفاده</label>
                    <Input
                      type="number"
                      value={couponMaxUses}
                      onChange={(e) => setCouponMaxUses(Number(e.target.value))}
                      className="border-white/10 bg-white/5 text-sm text-slate-100"
                    />
                  </div>
                </div>
                <Button
                  className="bg-gradient-to-l from-cyan-500 to-cyan-600 text-white"
                  disabled={!couponCode}
                  onClick={() => {
                    toast.success(`کوپن ${couponCode} با ${couponPercent}% تخفیف ایجاد شد`);
                    setCouponCode("");
                  }}
                >
                  <Tag className="ml-2 size-4" />
                  ایجاد کوپن
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Detail Dialog */}
      <Dialog open={!!showProductDetail} onOpenChange={() => setShowProductDetail(null)}>
        <DialogContent className="border-white/10 bg-[#0b1a2a] text-white max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{showProductDetail?.title}</DialogTitle>
          </DialogHeader>
          {showProductDetail && (
            <div className="space-y-4">
              {showProductDetail.coverImage && (
                <img src={showProductDetail.coverImage} alt="" className="w-full rounded-xl object-cover" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-xs text-slate-400">فروشنده</p>
                  <p className="font-medium text-white">{showProductDetail.sellerName}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-xs text-slate-400">قیمت</p>
                  <p className="font-medium text-cyan-300">{formatPriceNumber(showProductDetail.price)} تومان</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-xs text-slate-400">موجودی</p>
                  <p className="font-medium text-white">{showProductDetail.stock}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-xs text-slate-400">فروش</p>
                  <p className="font-medium text-white">{showProductDetail.soldCount}</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 whitespace-pre-wrap">{showProductDetail.description}</p>
              {showProductDetail.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 text-white"
                    onClick={async () => {
                      await approveProduct({ productId: showProductDetail._id, status: "approved" });
                      toast.success("تأیید شد");
                      setShowProductDetail(null);
                    }}
                  >
                    <CheckCircle className="ml-2 size-4" /> تأیید
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={async () => {
                      await approveProduct({ productId: showProductDetail._id, status: "rejected", rejectionReason: "تأیید نشد" });
                      toast.success("رد شد");
                      setShowProductDetail(null);
                    }}
                  >
                    <XCircle className="ml-2 size-4" /> رد
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

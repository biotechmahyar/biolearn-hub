import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMode } from "@/hooks/useMode";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { formatPriceNumber } from "@/lib/format";
import { toast } from "sonner";
import {
  Plus,
  Package,
  TrendingUp,
  DollarSign,
  Star,
  Flame,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "پیش‌نویس", color: "bg-slate-500/15 text-slate-300" },
  pending: { label: "در انتظار تأیید", color: "bg-amber-500/15 text-amber-300" },
  approved: { label: "منتشر شده", color: "bg-emerald-500/15 text-emerald-300" },
  rejected: { label: "رد شده", color: "bg-red-500/15 text-red-300" },
  sold_out: { label: "ناموجود", color: "bg-slate-500/15 text-slate-300" },
};

export default function SellerPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"products" | "sales" | "wallet">("products");
  const [showCreate, setShowCreate] = useState(false);

  // Product form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("notes");
  const [condition, setCondition] = useState<string>("new");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const myProducts = useQuery(api.marketplace.getMyProducts);
  const mySales = useQuery(api.marketplace.getMySales);
  const wallet = useQuery(api.marketplace.getMyWallet);
  const walletTransactions = useQuery(api.marketplace.getMyTransactions, { limit: 30 });
  const createProduct = useMutation(api.marketplace.createProduct);
  const deleteProduct = useMutation(api.marketplace.deleteProduct);
  const confirmShipment = useMutation(api.marketplace.confirmShipment);
  const boostProduct = useMutation(api.marketplace.boostProduct);

  const totalEarnings = mySales
    ?.filter((s: any) => s.status === "completed")
    .reduce((sum: number, s: any) => sum + s.sellerEarning, 0) ?? 0;

  const totalSalesCount = mySales?.filter((s: any) => s.status === "completed").length ?? 0;
  const pendingCount = mySales?.filter((s: any) => s.status === "paid").length ?? 0;

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("عنوان الزامی است."); return; }
    if (!description.trim()) { toast.error("توضیحات الزامی است."); return; }
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 1000) { toast.error("حداقل قیمت ۱,۰۰۰ تومان."); return; }
    setBusy(true);
    try {
      await createProduct({
        title: title.trim(),
        description: description.trim(),
        category: category as any,
        condition: condition as any,
        price: priceNum,
        stock: Number(stock) || 1,
        images: [],
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });
      toast.success("محصول ثبت شد و منتظر تأیید مدیر است.");
      setShowCreate(false);
      setTitle(""); setDescription(""); setPrice(""); setStock("1"); setTags("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این محصول مطمئنید؟")) return;
    try {
      await deleteProduct({ productId: id as any });
      toast.success("محصول حذف شد.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  const handleShipment = async (orderId: string) => {
    try {
      await confirmShipment({ orderId: orderId as any });
      toast.success("ارسال تأیید شد.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  const handleBoost = async (productId: string, level: "silver" | "gold") => {
    try {
      await boostProduct({ productId: productId as any, boostLevel: level });
      toast.success(level === "gold" ? "تبلیغ طلایی ۳۰ روزه فعال شد! 🏆" : "تبلیغ نقره‌ای ۱ هفته فعال شد! ⚡");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="min-h-screen bg-[#071019] text-slate-200" dir="rtl">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-white">پنل فروشندگان</h1>
          <p className="mt-1 text-sm text-slate-400">مدیریت محصولات، فروش و درآمد</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          {[
            { label: "محصولات", value: myProducts?.length ?? 0, icon: Package, color: "text-cyan-400" },
            { label: "فروش موفق", value: totalSalesCount, icon: TrendingUp, color: "text-emerald-400" },
            { label: "در انتظار ارسال", value: pendingCount, icon: Loader2, color: "text-amber-400" },
            { label: "درآمد کل", value: formatPriceNumber(totalEarnings) + " ₮", icon: DollarSign, color: "text-purple-400" },
          ].map((s) => (
            <Card key={s.label} className="border-white/5 bg-white/[0.02]">
              <CardContent className="flex items-center gap-3 py-4">
                <div className={`rounded-lg bg-white/5 p-2.5 ${s.color}`}>
                  <s.icon className="size-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-slate-400">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {[
            { key: "products", label: "محصولات من" },
            { key: "sales", label: "فروش‌ها" },
            { key: "wallet", label: "کیف پول" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                tab === t.key
                  ? "bg-cyan-400/15 text-cyan-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                className="bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="ml-2 size-4" />
                محصول جدید
              </Button>
            </div>

            {/* Create Form */}
            {showCreate && (
              <Card className="border-cyan-400/20 bg-[#0b1a2a]">
                <CardHeader>
                  <CardTitle className="text-sm text-cyan-200">افزودن محصول جدید</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="عنوان محصول" value={title} onChange={(e) => setTitle(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
                  <Textarea placeholder="توضیحات کامل محصول..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px] border-white/10 bg-white/5 text-slate-100" />
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="notes">جزوه</SelectItem>
                        <SelectItem value="flashcards">فلش کارت</SelectItem>
                        <SelectItem value="book">کتاب</SelectItem>
                        <SelectItem value="package">بسته آموزشی</SelectItem>
                        <SelectItem value="other">سایر</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">نو</SelectItem>
                        <SelectItem value="like_new">تقریباً نو</SelectItem>
                        <SelectItem value="used">کارکرده</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder="قیمت (تومان)" value={price} onChange={(e) => setPrice(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
                    <Input type="number" placeholder="موجودی" value={stock} onChange={(e) => setStock(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
                  </div>
                  <Input placeholder="برچسب‌ها (با کاما جدا کنید)" value={tags} onChange={(e) => setTags(e.target.value)} className="border-white/10 bg-white/5 text-slate-100" />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>انصراف</Button>
                    <Button size="sm" onClick={handleCreate} disabled={busy}>
                      {busy ? <Loader2 className="ml-1 size-3 animate-spin" /> : null}
                      ثبت محصول
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Products List */}
            {myProducts && myProducts.length > 0 ? (
              <div className="space-y-3">
                {myProducts.map((p: any) => {
                  const st = STATUS_MAP[p.status] ?? STATUS_MAP.draft;
                  return (
                    <Card key={p._id} className="border-white/5 bg-white/[0.02]">
                      <CardContent className="flex items-center justify-between py-3 px-4">
                        <div className="flex items-center gap-4">
                          <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                            {p.coverImage ? (
                              <img src={p.coverImage} alt="" className="size-full object-cover" />
                            ) : (
                              <Package className="size-5 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{p.title}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>{formatPriceNumber(p.price)} تومان</span>
                              <span>·</span>
                              <span>{p.stock} موجود</span>
                              <span>·</span>
                              <span>{p.soldCount} فروش</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("border-0 text-[9px]", st.color)}>{st.label}</Badge>
                          {p.status === "approved" && p.boostLevel === "none" && (
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-amber-300 hover:text-amber-200" onClick={() => handleBoost(p._id, "silver")}>
                              <Flame className="ml-1 size-3" /> نردبان ۱ هفته
                            </Button>
                          )}
                          {p.status === "approved" && (
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-300 hover:text-red-200" onClick={() => handleDelete(p._id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-white/5 bg-white/[0.02]">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Package className="size-8 text-slate-600" />
                  <p className="text-sm text-slate-400">هنوز محصولی ثبت نکرده‌اید.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Sales Tab */}
        {tab === "sales" && (
          <div className="space-y-3">
            {mySales && mySales.length > 0 ? (
              mySales.map((order: any) => (
                <Card key={order._id} className="border-white/5 bg-white/[0.02]">
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-white">سفارش {order.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString("fa-IR")} · تعداد: {order.quantity} ·
                        درآمد: {formatPriceNumber(order.sellerEarning)} تومان
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("border-0 text-[9px]", STATUS_MAP[order.status]?.color ?? "")}>
                        {STATUS_MAP[order.status]?.label ?? order.status}
                      </Badge>
                      {order.status === "paid" && (
                        <Button size="sm" className="h-7 text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" onClick={() => handleShipment(order._id)}>
                          تأیید ارسال
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-white/5 bg-white/[0.02]">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <TrendingUp className="size-8 text-slate-600" />
                  <p className="text-sm text-slate-400">هنوز فروشی نداشته‌اید.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Wallet Tab */}
        {tab === "wallet" && (
          <div className="space-y-4">
            <Card className="border-cyan-400/20 bg-[#0b1a2a]">
              <CardContent className="py-6 text-center">
                <p className="text-4xl font-extrabold text-white">
                  {formatPriceNumber(wallet?.balance ?? 0)}
                  <span className="mr-2 text-sm font-normal text-slate-400">تومان</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">موجودی کیف پول</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-white/5 bg-white/[0.02]">
                <CardContent className="py-3 text-center">
                  <p className="text-lg font-bold text-emerald-400">{formatPriceNumber(wallet?.totalEarned ?? 0)}</p>
                  <p className="text-[10px] text-slate-400">کل درآمد</p>
                </CardContent>
              </Card>
              <Card className="border-white/5 bg-white/[0.02]">
                <CardContent className="py-3 text-center">
                  <p className="text-lg font-bold text-amber-400">{formatPriceNumber(wallet?.frozenBalance ?? 0)}</p>
                  <p className="text-[10px] text-slate-400">مبلغ بلاک شده</p>
                </CardContent>
              </Card>
            </div>

            {/* Transactions */}
            <h3 className="text-sm font-bold text-white">تراکنش‌های اخیر</h3>
            {walletTransactions && walletTransactions.length > 0 ? (
              <div className="space-y-2">
                {walletTransactions.map((tx: any) => (
                  <Card key={tx._id} className="border-white/5 bg-white/[0.02]">
                    <CardContent className="flex items-center justify-between py-2.5 px-4">
                      <div>
                        <p className="text-xs text-white">{tx.description}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(tx.createdAt).toLocaleDateString("fa-IR")}
                        </p>
                      </div>
                      <span className={cn("text-sm font-bold", tx.amount >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {tx.amount >= 0 ? "+" : ""}{formatPriceNumber(Math.abs(tx.amount))}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">تراکنشی وجود ندارد.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { formatPriceNumber } from "@/lib/format";
import {
  Search,
  Filter,
  Star,
  ShoppingBag,
  BookOpen,
  Layers,
  CreditCard,
  Package,
  MoreHorizontal,
  Flame,
  TrendingUp,
  ChevronLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "notes", label: "جزوه", icon: BookOpen, color: "text-cyan-400" },
  { key: "flashcards", label: "فلش کارت", icon: CreditCard, color: "text-amber-400" },
  { key: "book", label: "کتاب", icon: BookOpen, color: "text-emerald-400" },
  { key: "package", label: "بسته آموزشی", icon: Package, color: "text-purple-400" },
  { key: "other", label: "سایر", icon: MoreHorizontal, color: "text-slate-400" },
] as const;

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

export default function Marketplace() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "cheapest" | "expensive" | "popular" | "boosted">("newest");
  const [showFilters, setShowFilters] = useState(false);

  const products = useQuery(api.marketplace.listProducts, {
    category: (category as any) || undefined,
    search: search || undefined,
    sort,
    limit: 48,
  });

  const categoryCounts = useQuery(api.marketplace.getCategoryCounts);

  const isBoosted = (p: any) => {
    const now = Date.now();
    return (
      (p.boostLevel === "gold" || p.boostLevel === "silver") &&
      (p.boostExpiresAt ?? 0) > now
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071019] via-[#0a1520] to-[#071019] text-slate-200" dir="rtl">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-cyan-400/10 bg-[#0b1a2a]">
        <div className="absolute inset-0 bg-gradient-to-l from-cyan-400/5 via-transparent to-purple-500/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-purple-500/20 ring-1 ring-cyan-400/20">
              <ShoppingBag className="size-7 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                بازارچه تخصصی علوم زیستی
              </h1>
              <p className="mt-2 text-sm text-slate-400 sm:text-base">
                جزوه، فلش کارت، کتاب و بسته‌های آموزشی از دانشجویان و اساتید
              </p>
            </div>
            {user && (
              <Link to="/dashboard/store/sell">
                <Button className="bg-gradient-to-l from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500 shadow-lg shadow-cyan-500/20">
                  <Flame className="ml-2 size-4" />
                  فروش محصول
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Search & Filter Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="جستجو در محصولات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 border-white/10 bg-white/5 pr-10 text-sm text-slate-100 placeholder:text-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-11 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            onClick={() => setShowFilters((s) => !s)}
          >
            <Filter className="ml-2 size-4" />
            فیلتر و مرتب‌سازی
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6 border-white/10 bg-white/[0.02]">
            <CardContent className="space-y-4 py-4">
              {/* Categories */}
              <div>
                <p className="mb-2 text-xs font-bold text-slate-400">دسته‌بندی</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategory(null)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                      !category
                        ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/30"
                        : "bg-white/5 text-slate-400 hover:bg-white/10",
                    )}
                  >
                    همه ({(categoryCounts?.notes ?? 0) + (categoryCounts?.flashcards ?? 0) + (categoryCounts?.book ?? 0) + (categoryCounts?.package ?? 0) + (categoryCounts?.other ?? 0)})
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setCategory(category === cat.key ? null : cat.key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                        category === cat.key
                          ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/30"
                          : "bg-white/5 text-slate-400 hover:bg-white/10",
                      )}
                    >
                      <cat.icon className={cn("size-3.5", cat.color)} />
                      {cat.label} ({categoryCounts?.[cat.key] ?? 0})
                    </button>
                  ))}
                </div>
              </div>
              {/* Sort */}
              <div>
                <p className="mb-2 text-xs font-bold text-slate-400">مرتب‌سازی</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "newest", label: "جدیدترین" },
                    { key: "cheapest", label: "ارزان‌ترین" },
                    { key: "expensive", label: "گران‌ترین" },
                    { key: "popular", label: "پرفروش‌ترین" },
                    { key: "boosted", label: "تبلیغ‌شده" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSort(s.key as typeof sort)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                        sort === s.key
                          ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/30"
                          : "bg-white/5 text-slate-400 hover:bg-white/10",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Grid */}
        {products?.items && products.items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.items.map((p: any) => (
              <Link key={p._id} to={`/marketplace/${p.slug}`}>
                <Card
                  className={cn(
                    "group overflow-hidden border-white/5 bg-white/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:shadow-lg hover:shadow-cyan-500/5",
                    isBoosted(p) && "border-amber-400/20 ring-1 ring-amber-400/10",
                  )}
                >
                  {/* Cover Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02]">
                    {p.coverImage ? (
                      <img
                        src={p.coverImage}
                        alt={p.title}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <BookOpen className="size-12 text-slate-700" />
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute right-2 top-2 flex flex-col gap-1">
                      {isBoosted(p) && (
                        <Badge className="border-0 bg-amber-500/90 text-[9px] text-white shadow-lg">
                          <Flame className="ml-1 size-2.5" />
                          ویژه
                        </Badge>
                      )}
                      {p.soldCount >= 10 && (
                        <Badge className="border-0 bg-emerald-500/90 text-[9px] text-white shadow-lg">
                          <TrendingUp className="ml-1 size-2.5" />
                          پرفروش
                        </Badge>
                      )}
                    </div>
                    {/* Condition */}
                    <Badge
                      className={cn(
                        "absolute bottom-2 right-2 border-0 text-[9px]",
                        CONDITION_COLORS[p.condition],
                      )}
                    >
                      {CONDITION_LABELS[p.condition]}
                    </Badge>
                  </div>

                  <CardContent className="space-y-2 p-4">
                    <h3 className="line-clamp-2 text-sm font-bold text-white group-hover:text-cyan-200">
                      {p.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{p.sellerName}</span>
                      <span>·</span>
                      <span>{CATEGORIES.find((c) => c.key === p.category)?.label}</span>
                    </div>
                    {/* Rating */}
                    {p.ratingCount > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-amber-300">{p.rating}</span>
                        <span className="text-slate-500">({p.ratingCount})</span>
                      </div>
                    )}
                    {/* Price */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-lg font-extrabold text-white">
                        {formatPriceNumber(p.price)}
                        <span className="mr-1 text-xs font-normal text-slate-400">تومان</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {p.soldCount} فروش
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
              <ShoppingBag className="size-12 text-slate-600" />
              <p className="text-sm text-slate-400">
                {search
                  ? "محصولی با این عنوان یافت نشد."
                  : "هنوز محصولی در بازارچه وجود ندارد."}
              </p>
              {user && (
                <Link to="/dashboard/store/sell">
                  <Button size="sm" className="bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20">
                    اولین محصول را بفروشید
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

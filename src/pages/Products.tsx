import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { faNum, PRODUCT_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { Package } from "lucide-react";
import { useState } from "react";

const TYPES = ["all", "flashcards", "guide", "poster"] as const;

export default function Products() {
  const products = useQuery(api.content.listProducts, {});
  const [type, setType] = useState<(typeof TYPES)[number]>("all");

  const filtered = (products ?? []).filter((p) => type === "all" || p.type === type);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">محصولات آموزشی فیزیکی</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            مرور فعال، بیرون از صفحهٔ نمایش
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            فلش‌کارت‌ها، کتابچه‌های جمع‌بندی و پوسترهای آموزشی که تیم زیست‌آکادمی
            طراحی کرده تا مرور شب امتحان و یادگیری مفهومی ساده‌تر شود.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Button
              key={t}
              variant={type === t ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setType(t)}
            >
              {t === "all" ? "همه" : PRODUCT_TYPE_LABELS[t]}
            </Button>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {filtered ? `${faNum(filtered.length)} محصول` : "..."}
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product._id} product={product as any} />
          ))}
        </div>

        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-6">
          <Package className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="text-sm leading-6 text-muted-foreground">
            <p className="font-bold text-foreground">ارسال سراسری</p>
            <p className="mt-1">
              محصولات فیزیکی از طریق پست ارسال می‌شوند و زمان تحویل بسته به شهر
              شما ۲ تا ۵ روز کاری است. محصولات آزمایشگاهی و نمونه‌های زیستی در
              این فروشگاه قرار نمی‌گیرند.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

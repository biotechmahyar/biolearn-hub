import { Link } from "react-router";
import { useApi } from "@/hooks/use-api";
import { accent, formatPrice, PRODUCT_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

export default function Products() {
  const products = useApi<any[]>("/api/content/products");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">محصولات آموزشی</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">فلش‌کارت، راهنما و پوستر</h1>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(products ?? []).map((product: any) => {
          const a = accent(product.accent);
          return (
            <Link
              key={product._id}
              to={`/products/${product.slug}`}
              className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Badge className={cn("rounded-full ring-1", a.chip)}>
                {PRODUCT_TYPE_LABELS[product.type] || product.type}
              </Badge>
              <h3 className="mt-3 font-bold">{product.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
              <div className="mt-4 border-t border-border/70 pt-3 text-sm font-extrabold text-primary">
                {formatPrice(product.price)}
              </div>
            </Link>
          );
        })}
      </div>

      {products && products.length === 0 && (
        <div className="mt-20 text-center text-muted-foreground">
          <Package className="mx-auto size-12 opacity-30" />
          <p className="mt-3">هنوز محصولی اضافه نشده.</p>
        </div>
      )}
    </div>
  );
}

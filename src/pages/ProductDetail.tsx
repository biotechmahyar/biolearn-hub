import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckoutDialog } from "@/components/site/CheckoutDialog";
import { PublicLayout } from "@/components/site/PublicLayout";
import { productIconFor } from "@/components/site/icons";
import { useApiQuery } from "@/hooks/use-api";
import { accent, formatPrice, PRODUCT_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronLeft, Package, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const product = useApiQuery<any>(slug ? `/api/content/products/${slug}` : null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (product === undefined) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          در حال بارگذاری...
        </div>
      </PublicLayout>
    );
  }
  if (!product) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          محصول پیدا نشد.
        </div>
      </PublicLayout>
    );
  }

  const a = accent(product.accent);
  const Icon = productIconFor(product.type);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">خانه</Link>
          <ChevronLeft className="size-3.5" />
          <Link to="/products" className="hover:text-foreground">محصولات</Link>
          <ChevronLeft className="size-3.5" />
          <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className={cn("relative flex h-64 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br", a.grad)}>
              <div className="absolute inset-0 bg-lab-grid opacity-30" />
              <Icon className="relative size-20 text-white/95 drop-shadow" />
              <Badge className="absolute right-4 top-4 border-0 bg-black/25 text-white backdrop-blur">
                {PRODUCT_TYPE_LABELS[product.type]}
              </Badge>
            </div>

            <h1 className="mt-6 text-2xl font-extrabold sm:text-3xl">{product.title}</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
              {product.description}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-muted-foreground">
                  محتوای علمی توسط تیم میکروبیولوژی و بیوتکنولوژی زیست‌آکادمی طراحی و بازبینی شده است.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
                <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-muted-foreground">
                  ارسال با پست پیشتاز؛ ۲ تا ۵ روز کاری به سراسر کشور.
                </p>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="border-border/70 shadow-lg shadow-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black">{formatPrice(product.price)}</span>
                  <Package className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">قیمت نهایی شامل ارسال نمی‌شود</p>
                <Button size="lg" className="mt-5 w-full rounded-full" onClick={() => setCheckoutOpen(true)}>
                  <ShoppingBag className="ml-2 size-4" />
                  خرید محصول
                </Button>
                <ul className="mt-5 space-y-2 text-[13px] text-muted-foreground">
                  {["بازگشت وجه تا ۷ روز", "فاکتور رسمی", "بسته‌بندی ایمن"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={[{ type: "product", refId: product._id, title: product.title, price: product.price }]}
        successTitle="سفارش شما ثبت شد"
        successDescription="محصول به‌زودی برایتان ارسال می‌شود. شماره پیگیری در پنل دانشجویی در دسترس است."
      />
    </PublicLayout>
  );
}

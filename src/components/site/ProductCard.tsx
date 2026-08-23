import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { accent, formatPrice, PRODUCT_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { productIconFor } from "./icons";

type Product = {
  _id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  price: number;
  accent: string;
  featured?: boolean;
};

export function ProductCard({ product }: { product: Product }) {
  const a = accent(product.accent);
  const Icon = productIconFor(product.type);

  return (
    <Card className="group overflow-hidden border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
      <div className={cn("relative flex h-32 items-center justify-center bg-gradient-to-br", a.grad)}>
        <div className="absolute inset-0 bg-lab-grid opacity-40" />
        <Icon className="relative size-11 text-white/95 drop-shadow-sm" />
        <Badge className="absolute right-3 top-3 border-0 bg-black/25 text-white backdrop-blur-sm">
          {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="text-[15px] font-bold leading-6">{product.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
          {product.description}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3.5">
          <span className="text-[15px] font-extrabold">
            {product.price === 0 ? (
              <span className="text-emerald-500">رایگان</span>
            ) : (
              formatPrice(product.price)
            )}
          </span>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to={`/products/${product.slug}`}>
              مشاهده
              <ArrowLeft className="mr-1.5 size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

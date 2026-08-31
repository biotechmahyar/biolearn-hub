import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/site/ArticleCard";
import { PublicLayout } from "@/components/site/PublicLayout";
import { useApiQuery } from "@/hooks/use-api";
import { faNum } from "@/lib/format";
import { useState } from "react";

export default function FreeContent() {
  const articles = useApiQuery<any[]>("/api/content/articles");
  const [category, setCategory] = useState<string>("");

  const cats = [...new Set((articles ?? []).map((a) => a.category))];
  const filtered = (articles ?? []).filter((a) => !category || a.category === category);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">محتوای رایگان</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            یادگیری که قبل از خرید شروع می‌شود
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            یادداشت‌های علمی، روش‌های مطالعه، نکات امتحانی، گفت‌وگوها و گزارش
            نشست‌ها — رایگان برای همه، تا با کیفیت محتوای ما آشنا شوی.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button
            variant={!category ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setCategory("")}
          >
            همه
          </Button>
          {cats.map((c) => (
            <Button
              key={c}
              variant={category === c ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setCategory(category === c ? "" : c)}
            >
              {c}
            </Button>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {filtered ? `${faNum(filtered.length)} مطلب` : "..."}
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <ArticleCard key={article._id} article={article as any} />
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

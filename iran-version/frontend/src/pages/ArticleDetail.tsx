import { Link, useParams } from "react-router";
import { useApi } from "@/hooks/use-api";
import { accent, faNum, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Clock } from "lucide-react";

export default function ArticleDetail() {
  const { slug = "" } = useParams();
  const article = useApi<any>(slug ? `/api/content/articles/${slug}` : null);

  if (article === undefined) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">در حال بارگذاری...</div>;
  if (!article) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">مطلب پیدا نشد.</div>;

  const a = accent(article.accent);
  const paragraphs = (article.body || "").split("\n\n");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">خانه</Link>
        <ChevronLeft className="size-3.5" />
        <Link to="/articles" className="hover:text-foreground">مقالات</Link>
        <ChevronLeft className="size-3.5" />
        <span className="text-foreground">{article.category}</span>
      </nav>

      {article.featuredImage && (
        <div className="mt-4 w-full overflow-hidden rounded-xl">
          <img src={article.featuredImage} alt={article.title} className="h-auto w-full object-cover" />
        </div>
      )}

      <Badge className={cn("mt-4 rounded-full ring-1", a.chip)}>{article.category}</Badge>
      <h1 className="mt-4 text-2xl font-extrabold leading-10 sm:text-3xl">{article.title}</h1>

      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{article.authorName}</span>
        <span>{formatDate(article.createdAt)}</span>
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" /> {faNum(article.readTime)} دقیقه مطالعه
        </span>
      </div>

      <div className="mt-8 space-y-5">
        {paragraphs.map((p: string, i: number) => (
          <p key={i} className="text-[15px] leading-8 text-foreground/90">{p}</p>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Button asChild className="rounded-full">
          <Link to="/articles">بازگشت به مقالات</Link>
        </Button>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";

import { Link } from "react-router";
import { useApi } from "@/hooks/use-api";
import { accent, faNum, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock } from "lucide-react";

export default function Articles() {
  const articles = useApi<any[]>("/api/content/articles");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">مقالات رایگان</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">محتوای تخصصی علوم زیستی</h1>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(articles ?? []).map((article: any) => {
          const a = accent(article.accent);
          return (
            <Link
              key={article._id}
              to={`/articles/${article.slug}`}
              className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              {article.featuredImage && (
                <div className="mb-3 aspect-video overflow-hidden rounded-xl">
                  <img src={article.featuredImage} alt={article.title} className="h-full w-full object-cover" />
                </div>
              )}
              <Badge className={cn("rounded-full ring-1", a.chip)}>{article.category}</Badge>
              <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6">{article.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{article.excerpt}</p>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{article.authorName}</span>
                <span className="flex items-center gap-1"><Clock className="size-3" /> {faNum(article.readTime)} دقیقه</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

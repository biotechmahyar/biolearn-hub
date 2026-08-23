import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/site/ArticleCard";
import { InstructorAvatar } from "@/components/site/InstructorAvatar";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { accent, faNum, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { ChevronLeft, Clock } from "lucide-react";
import { Link, useParams } from "react-router";

export default function ArticleDetail() {
  const { slug = "" } = useParams();
  const article = useQuery(api.content.getArticleBySlug, { slug });
  const articles = useQuery(api.content.listArticles, {});

  if (article === undefined) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          در حال بارگذاری...
        </div>
      </PublicLayout>
    );
  }
  if (!article) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          مطلب پیدا نشد.
        </div>
      </PublicLayout>
    );
  }

  const a = accent(article.accent);
  const related = (articles ?? []).filter((x) => x._id !== article._id).slice(0, 3);
  const paragraphs = article.body.split("\n\n");

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">خانه</Link>
          <ChevronLeft className="size-3.5" />
          <Link to="/free-content" className="hover:text-foreground">محتوای رایگان</Link>
          <ChevronLeft className="size-3.5" />
          <span className="text-foreground">{article.category}</span>
        </nav>

        <Badge variant="secondary" className={cn("rounded-full ring-1", a.chip)}>
          {article.category}
        </Badge>
        <h1 className="mt-4 text-2xl font-extrabold leading-10 sm:text-3xl sm:leading-[1.5] text-balance">
          {article.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <InstructorAvatar name={article.authorName} accent={article.accent} className="size-8 text-[11px]" />
            <b className="font-semibold text-foreground">{article.authorName}</b>
          </span>
          <span>{formatDate(article.createdAt)}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {faNum(article.readTime)} دقیقه مطالعه
          </span>
        </div>

        <div className="mt-8 space-y-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] leading-8 text-foreground/90">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border/70 bg-card/60 p-6 text-center">
          <p className="text-sm font-bold">این مطلب برایت مفید بود؟</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            محتوای تخصصی‌تر و دوره‌های کامل در بخش دوره‌ها منتظر توست.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full">
              <Link to="/courses">مشاهده دوره‌ها</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/daily-quiz">کوئیز روزانه</Link>
            </Button>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <h2 className="mb-5 text-lg font-extrabold">مطالب مرتبط</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ArticleCard key={r._id} article={r as any} />
            ))}
          </div>
        </div>
      )}
    </PublicLayout>
  );
}

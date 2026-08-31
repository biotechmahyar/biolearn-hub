import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/site/ArticleCard";
import { InstructorAvatar } from "@/components/site/InstructorAvatar";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { accent, faNum, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, Clock, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

export default function ArticleDetail() {
  const { slug = "" } = useParams();
  const article = useQuery(api.content.getArticleBySlug, { slug });
  const articles = useQuery(api.content.listArticles, {});
  const { isAuthenticated } = useAuth();
  const comments = useQuery(
    api.comments.listComments,
    article ? { contentType: "article", contentId: article._id } : "skip",
  );
  const addComment = useMutation(api.comments.addComment);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

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

        {article.featuredImage && (
          <div className="mt-4 w-full overflow-hidden rounded-xl">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="h-auto w-full object-cover"
            />
          </div>
        )}
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

        {/* Comments */}
        <div className="mt-10 rounded-2xl border border-border/70 bg-card/60 p-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <MessageCircle className="size-5 text-primary" />
            دیدگاه‌ها
            {comments && comments.length > 0 && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                {faNum(comments.length)}
              </span>
            )}
          </h2>

          <div className="mt-5 space-y-4">
            {(comments ?? []).map((c) => (
              <div key={c._id} className="rounded-xl border border-border/70 bg-background/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">{c.author}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(c.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm leading-7 text-foreground/90">{c.text}</p>
              </div>
            ))}
            {comments && comments.length === 0 && (
              <p className="text-sm text-muted-foreground">اولین نفری باش که دیدگاه می‌گذارد.</p>
            )}
          </div>

          {isAuthenticated ? (
            <form
              className="mt-5 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draft.trim() || sending) return;
                setSending(true);
                try {
                  await addComment({ contentType: "article", contentId: article._id, text: draft });
                  setDraft("");
                } finally {
                  setSending(false);
                }
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="دیدگاهت را بنویس..."
                className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none ring-ring/30 transition-shadow placeholder:text-muted-foreground focus:ring-2"
              />
              <Button type="submit" disabled={!draft.trim() || sending} className="rounded-xl">
                <Send className="ml-1.5 size-4" />
                ارسال
              </Button>
            </form>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border bg-background/40 p-4 text-center text-sm text-muted-foreground">
              برای ثبت دیدگاه{" "}
              <Link
                to={`/auth?returnTo=${encodeURIComponent(`/free-content/${article.slug}`)}`}
                className="font-semibold text-primary hover:underline"
              >
                وارد حساب شو
              </Link>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-border/70 bg-card/60 p-6 text-center">
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

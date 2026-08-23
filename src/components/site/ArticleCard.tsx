import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { accent, faNum, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { Link } from "react-router";

type Article = {
  _id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  authorName: string;
  accent: string;
  readTime: number;
  createdAt: number;
  featured?: boolean;
};

export function ArticleCard({ article }: { article: Article }) {
  const a = accent(article.accent);
  return (
    <Link to={`/free-content/${article.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col border-border/70 bg-card/80 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-primary/5">
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn("rounded-full ring-1", a.chip)}>
              {article.category}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {faNum(article.readTime)} دقیقه
            </span>
          </div>
          <h3 className="mt-3 text-[15px] font-bold leading-6 transition-colors group-hover:text-primary">
            {article.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
            {article.excerpt}
          </p>
          <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
            <span>{article.authorName}</span>
            <span>{formatDate(article.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

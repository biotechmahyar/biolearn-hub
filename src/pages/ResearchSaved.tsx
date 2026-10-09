import { useQuery, useMutation } from "convex/react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { SOURCE_LABELS } from "@/convex/researchAdapters";
import { Bookmark, BookmarkCheck, ExternalLink, Search, BookOpen, X } from "lucide-react";
import { toast } from "sonner";

export default function ResearchSaved() {
  const saved = useQuery(api.research.mySavedPapers, { limit: 60 });
  const toggle = useMutation(api.research.toggleSavedPaper);

  return (
    <div className="flex min-h-screen flex-col bg-[#eef5f2] text-slate-800">
      <header className="border-b border-emerald-900/8 bg-white/92 backdrop-blur-xl px-5 py-4 lg:static lg:block">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/virtual-lab/research" className="flex size-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-900/20 transition-colors hover:bg-emerald-800">
              <BookOpen className="size-4.5" />
            </Link>
            <div>
              <h1 className="text-[13px] font-extrabold text-slate-900">مقالات ذخیره‌شده</h1>
              <p className="text-[10px] text-slate-400">ژنوا · کتابخانهٔ پژوهشی زیستی</p>
            </div>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
          {saved && saved.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-slate-500">
                {saved.length} مقاله ذخیره‌شده
              </p>
              <div className="flex flex-col gap-3">
                {saved.map(({ savedAt, paper }) => {
                  const year = paper.publicationDate ? new Date(paper.publicationDate).getUTCFullYear() : null;
                  const sources = paper.sources ?? [];
                  const primary = sources.find((s: any) => s.type === "pmc")?.url
                    ?? sources.find((s: any) => s.type === "pubmed")?.url
                    ?? sources?.[0]?.url;

                  return (
                    <article key={paper._id} className="group flex flex-col gap-2 rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_8px_18px_-12px_rgba(6,78,59,0.18)] transition-all hover:shadow-[0_1px_2px_rgba(6,78,59,0.06),0_16px_32px_-14px_rgba(6,78,59,0.3)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link to={`/virtual-lab/research/article/${paper._id}`} className="line-clamp-2 text-sm font-bold leading-5 text-slate-900 group-hover:text-emerald-700">
                            {paper.title}
                          </Link>
                          {paper.journal && <p className="mt-0.5 text-xs text-slate-500">{paper.journal}</p>}
                          {year && <p className="text-[10.5px] text-slate-400">{year}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await toggle({ paperId: paper._id, source: "research" });
                            toast.success("از ذخیره حذف شد");
                          }}
                          className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                          title="حذف از ذخیره"
                        >
                          <Bookmark className="size-4.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400">
                        {sources.map((s: any, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5">
                            <span className="shrink-0">
                              {s.type === "pubmed" ? "P" : s.type === "pmc" ? "PMC" : "SD"}
                            </span>
                            <span className="truncate max-w-[120px]">{s.id}</span>
                          </span>
                        ))}
                        {paper.isOpenAccess && (
                          <Badge className="bg-emerald-100 text-emerald-700">Open Access</Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-2 text-[10.5px] text-slate-400">
                          {paper.pmid && <span>PMID: {paper.pmid}</span>}
                          {paper.pmcid && <span className="ml-2">PMCID: {paper.pmcid}</span>}
                        </div>
                        <div className="flex gap-1.5">
                          {primary && (
                            <a
                              href={primary}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                            >
                              <ExternalLink className="size-3" />
                              بازگشت به منبع
                            </a>
                          )}
                          <Link to={`/virtual-lab/research/article/${paper._id}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700">
                            مشاهده جزئیات
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Bookmark className="mb-4 size-12 opacity-40" />
              <p className="text-base font-medium text-slate-500">هنوز مقاله‌ای ذخیره نشده</p>
              <p className="text-sm">در کتابخانه مقالاتی را جستجو کرده و آن‌ها را ذخیره کنید</p>
              <Link
                to="/virtual-lab/research"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800"
              >
                ورود به کتابخانه
                <Search className="size-4" />
              </Link>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

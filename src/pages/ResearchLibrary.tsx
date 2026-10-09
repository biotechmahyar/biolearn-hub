import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";
import { api } from "@/convex/_generated/api";
import { ARTICLE_TYPES, RESEARCH_TOPICS, SOURCE_LABELS } from "@/convex/researchAdapters";
import type { SourceId } from "@/convex/researchAdapters";
import {
  BookOpen, Bookmark, BookmarkCheck, ExternalLink, FlaskConical, Loader2,
  RotateCcw, Search, Sparkles, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const FIELDS = [
  "Biotechnology", "Microbiology", "Genetics", "Molecular Biology", "Cell Biology",
  "Cancer Biology", "Bioinformatics", "Genomics", "Immunology", "Biochemistry",
  "Virology", "Drug Discovery",
] as const;

const SORTS = [
  { id: "newest", label: "جدیدترین" },
  { id: "relevance", label: "مرتبط‌ترین" },
  { id: "oldest", label: "قدیمی‌ترین" },
] as const;

const PAGE_SIZE = 12;

type Paper = {
  _id: string;
  title: string;
  authors?: string;
  journal?: string;
  publicationDate?: number;
  articleType?: string;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  isOpenAccess?: boolean;
  genovaSummary?: string;
  topics?: string[];
  sourceUrl?: string;
  sources?: { type: string; id?: string; url?: string }[];
};

function yearOf(p: Paper) {
  return p.publicationDate ? new Date(p.publicationDate).getUTCFullYear() : null;
}

function primaryUrl(p: Paper) {
  const s = p.sources ?? [];
  return p.sourceUrl
    ?? s.find((x) => x.type === "pmc")?.url
    ?? s.find((x) => x.type === "pubmed")?.url
    ?? s.find((x) => x.type === "elsevier")?.url
    ?? s[0]?.url;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Paper card
// ═══════════════════════════════════════════════════════════════════════════

function PaperCard({ paper, saved, onToggle }: { paper: Paper; saved: boolean; onToggle: () => void }) {
  const year = yearOf(paper);
  const url = primaryUrl(paper);
  const sourceTypes = (paper.sources ?? []).map((s) => s.type);

  return (
    <article className="group flex flex-col gap-2 rounded-2xl border border-emerald-900/5 bg-white p-4 text-right shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(6,78,59,0.06),0_18px_36px_-22px_rgba(6,78,59,0.35)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {sourceTypes.map((t) => (
            <span key={t} className="rounded-full bg-slate-50 px-2 py-0.5 text-[9.5px] font-bold text-slate-500">
              {SOURCE_LABELS[t as SourceId] ?? t}
            </span>
          ))}
          {paper.isOpenAccess && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700">Open Access</span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          title={saved ? "حذف از ذخیره" : "ذخیرهٔ مقاله"}
          className={cn(
            "shrink-0 rounded-lg p-1.5 transition-colors",
            saved ? "bg-amber-50 text-amber-600" : "text-slate-300 hover:bg-amber-50 hover:text-amber-600",
          )}
        >
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </button>
      </div>

      <Link
        to={`/virtual-lab/research/article/${paper._id}`}
        className="line-clamp-2 text-[13.5px] font-bold leading-6 text-slate-900 transition-colors hover:text-emerald-700"
      >
        {paper.title}
      </Link>

      {paper.authors && <p className="line-clamp-1 text-[11px] text-slate-500">{paper.authors}</p>}

      <p className="text-[10.5px] text-slate-400">
        {paper.journal ?? "—"}{year ? ` · ${faNum(year)}` : ""}{paper.articleType ? ` · ${paper.articleType}` : ""}
      </p>

      {(paper.topics ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(paper.topics ?? []).slice(0, 3).map((t) => (
            <span key={t} className="rounded-md bg-emerald-50/70 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-700">
              {t}
            </span>
          ))}
        </div>
      )}

      {paper.genovaSummary && (
        <p className="line-clamp-3 text-[11.5px] leading-5 text-slate-600">{paper.genovaSummary}</p>
      )}

      <div className="mt-auto flex items-center justify-between pt-1 text-[10px] text-slate-400">
        <span className="font-mono">{[paper.doi && `DOI: ${paper.doi}`, paper.pmid && `PMID: ${paper.pmid}`].filter(Boolean).join(" · ")}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Link
          to={`/virtual-lab/research/article/${paper._id}`}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1.5 text-[10.5px] font-bold text-white transition-colors hover:bg-emerald-800"
        >
          جزئیات
        </Link>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1.5 text-[10.5px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <ExternalLink className="size-3" />
            مقالهٔ اصلی
          </a>
        )}
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════════════════════

export default function ResearchLibrary() {
  // ── Filters ──────────────────────────────────────────────────────────────
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | SourceId>("all");
  const [topic, setTopic] = useState<string | null>(null);
  const [articleType, setArticleType] = useState<string | null>(null);
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("newest");
  const [offset, setOffset] = useState(0);

  // Debounced search — prevents a request per keystroke (spec §7).
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(rawQuery.trim());
      setOffset(0);
    }, 400);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const filterArgs = useMemo(
    () => ({
      q: query || undefined,
      source: source === "all" ? undefined : source,
      topics: topic ? [topic] : undefined,
      articleType: articleType ?? undefined,
      openAccessOnly: openAccessOnly || undefined,
      sort: query ? "relevance" : sort,
    }),
    [query, source, topic, articleType, openAccessOnly, sort],
  );

  const page = useQuery(api.research.listPapers, { ...filterArgs, offset, limit: PAGE_SIZE });
  const popularTopics = useQuery(api.research.popularTopics, { limit: 12 });
  const savedIds = useQuery(api.research.savedIds, {});
  const stats = useQuery(api.research.researchStats, {});
  const syncStatus = useQuery(api.research.syncStatus, {});

  const toggle = useMutation(api.research.toggleSavedPaper);
  const sync = useAction(api.researchIngest.syncResearch);
  const [syncing, setSyncing] = useState(false);

  const savedSet = useMemo(() => new Set((savedIds ?? []).map((x: string) => x)), [savedIds]);

  const anyFilter = !!query || source !== "all" || !!topic || !!articleType || openAccessOnly;

  const handleToggle = async (paperId: string) => {
    try {
      const res = await toggle({ paperId: paperId as never, source: "research" });
      toast.success(res.saved ? "مقاله ذخیره شد" : "از ذخیره حذف شد");
    } catch {
      toast.error("برای ذخیره‌سازی ابتدا وارد حساب شوید.");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await sync({ query: query || "antibiotic resistance", limit: 10 });
      const ok = res.results.filter((r) => r.status === "processed").length;
      const total = res.results.reduce((a, r) => a + r.inserted + r.merged, 0);
      toast.success(`همگام‌سازی انجام شد: ${faNum(ok)} منبع فعال، ${faNum(total)} مقالهٔ جدید/ادغام‌شده`);
    } catch {
      toast.error("همگام‌سازی ناموفق بود؛ بعداً دوباره تلاش کنید.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#eef5f2] text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/8 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <Link
            to="/lab"
            className="flex size-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-900/20 transition-colors hover:bg-emerald-800"
            title="بازگشت به آزمایشگاه"
          >
            <FlaskConical className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-[14px] font-extrabold text-slate-900">🔬 ژنوا ریسرچ</h1>
            <p className="text-[10px] text-slate-400">کتابخانهٔ مقالات و منابع پژوهشی علوم زیستی</p>
          </div>
          <Link
            to="/virtual-lab/research/saved"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <Bookmark className="size-3.5" />
            ذخیره‌شده‌ها{stats ? ` (${faNum(stats.savedCount)})` : ""}
          </Link>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
          {/* Hero + search */}
          <div className="rounded-3xl border border-emerald-900/5 bg-gradient-to-l from-emerald-700 to-teal-600 p-6 text-white shadow-lg shadow-emerald-900/10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">جست‌وجوی ادبیات علمی</h2>
                <p className="mt-1 text-[11.5px] text-white/75">
                  PubMed · PMC · ScienceDirect — بدون خروج از ژنوا؛ ژنوا مقاله منتشر نمی‌کند، لینک اصلی را می‌دهد.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="gap-1.5 rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                همگام‌سازی امروز
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
              <Search className="mr-1 ml-2 size-4 shrink-0 text-slate-400" />
              <input
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                placeholder="CRISPR، سرطان پستان، مقاومت آنتی‌بیوتیکی، میکروبیوم…"
                className="w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-300"
              />
              {rawQuery && (
                <button
                  type="button"
                  onClick={() => setRawQuery("")}
                  className="rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-50"
                >
                  پاک کردن
                </button>
              )}
            </div>
          </div>

          {/* Quick topic chips */}
          {(popularTopics ?? []).length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-400">
                <TrendingUp className="size-3" />
                موضوعات پرتکرار:
              </span>
              {(popularTopics ?? []).map(({ topic: t, count }: { topic: string; count: number }) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTopic(topic === t ? null : t);
                    setOffset(0);
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors",
                    topic === t ? "bg-emerald-700 text-white" : "bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-700",
                  )}
                >
                  {t} <span className="opacity-60">{faNum(count)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Filters row */}
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-900/5 bg-white p-3">
            <select
              value={source}
              onChange={(e) => { setSource(e.target.value as "all" | SourceId); setOffset(0); }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] text-slate-700 outline-none"
            >
              <option value="all">همهٔ منابع</option>
              <option value="pubmed">PubMed</option>
              <option value="pmc">PMC</option>
              <option value="elsevier">ScienceDirect</option>
            </select>
            <select
              value={topic ?? ""}
              onChange={(e) => { setTopic(e.target.value || null); setOffset(0); }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] text-slate-700 outline-none"
            >
              <option value="">همهٔ حوزه‌ها</option>
              {RESEARCH_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={articleType ?? ""}
              onChange={(e) => { setArticleType(e.target.value || null); setOffset(0); }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] text-slate-700 outline-none"
            >
              <option value="">همهٔ انواع</option>
              {ARTICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
              <input
                type="checkbox"
                checked={openAccessOnly}
                onChange={(e) => { setOpenAccessOnly(e.target.checked); setOffset(0); }}
                className="size-3.5 accent-emerald-700"
              />
              فقط Open Access
            </label>
            <div className="mr-auto flex items-center gap-1">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setSort(s.id); setOffset(0); }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    sort === s.id ? "bg-emerald-700 text-white" : "text-slate-500 hover:bg-emerald-50",
                  )}
                >
                  {s.label}
                </button>
              ))}
              {anyFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setRawQuery(""); setQuery(""); setSource("all"); setTopic(null);
                    setArticleType(null); setOpenAccessOnly(false); setOffset(0);
                  }}
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50"
                >
                  حذف فیلترها
                </button>
              )}
            </div>
          </div>

          {/* Sources status */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(["pubmed", "pmc", "elsevier"] as SourceId[]).map((sid) => {
              const st = syncStatus?.[sid];
              const ok = st?.lastStatus === "ok";
              return (
                <span key={sid} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-900/5 bg-white px-3 py-1 text-[10.5px] text-slate-600">
                  <span className={cn("size-1.5 rounded-full", ok ? "bg-emerald-500" : st ? "bg-amber-400" : "bg-slate-300")} />
                  {SOURCE_LABELS[sid]}
                  {!st && <span className="text-slate-400">— هنوز همگام نشده</span>}
                  {st && !ok && <span className="text-amber-500">موقتاً در دسترس نیست</span>}
                </span>
              );
            })}
            {stats && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-900/5 bg-white px-3 py-1 text-[10.5px] text-slate-500">
                <Sparkles className="size-3 text-emerald-500" />
                {faNum(stats.total)} مقاله در کتابخانه · {faNum(stats.openAccess)} open access
              </span>
            )}
          </div>

          {/* Results */}
          <div className="mt-5">
            {!page ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
              </div>
            ) : page.items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-white/60 py-14 text-center">
                <BookOpen className="size-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">مقاله‌ای با این فیلترها پیدا نشد</p>
                <p className="max-w-sm text-[11.5px] text-slate-400">
                  کتابخانه با همگام‌سازی روزانه پر می‌شود. دکمهٔ «همگام‌سازی امروز» یا حذف فیلترها را امتحان کنید.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {page.items.map((p: Paper) => (
                    <PaperCard
                      key={p._id}
                      paper={p}
                      saved={savedSet.has(p._id)}
                      onToggle={() => handleToggle(p._id)}
                    />
                  ))}
                </div>
                {page.hasMore && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                      className="rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      مقالات بیشتر
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="mt-8 border-t border-emerald-900/5 pt-4 text-center text-[10px] text-slate-400">
            خلاصه‌های ژنوا با کمک هوش مصنوعی از چکیدهٔ مقاله ساخته می‌شوند — برای تصمیم علمی، مقالهٔ اصلی را از منبع رسمی بخوانید.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}

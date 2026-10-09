"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { motion } from "framer-motion";
import { ExternalLink, Filter, ChevronDown, RefreshCw, FileText as Citation, Clock, Tag, Download, BookmarkCheck, Search, BookOpen, Bookmark, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { formatJalaliDate, faNum } from "@/lib/format";
import { cn } from "@/lib/utils";

// ─── فیلد لجستیک ─────────────────────────────────────────────────────────────
type Source = "all" | "pubmed" | "pmc" | "elsevier";
type SortKey = "newest" | "title" | "citation";

interface PaperRow {
  _id: string;
  title: string;
  authors: string[];
  journal?: string;
  citationCount: number;
  publishedAtTimestamp: number;
  source: "pubmed" | "pmc" | "elsevier";
  isOpenAccess: boolean;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  topics: string[];
  summary?: string | null;
  // prefetched for the detail view (only on the row we open)
  abstract?: string | null;
  fullTextUrl?: string | null;
  pdfUrl?: string | null;
  relatedIds?: string[] | null;
}

// ─── کامپوننت‌ها ──────────────────────────────────────────────────────────────
function SourceChip({ source }: { source: PaperRow["source"] }) {
  const map = {
    pubmed: { label: "PubMed", color: "bg-blue-50 text-blue-700 ring-blue-200/60" },
    pmc: { label: "PMC", color: "bg-emerald-50 text-emerald-700 ring-emerald-200/60" },
    elsevier: { label: "Elsevier", color: "bg-violet-50 text-violet-700 ring-violet-200/60" },
  }[source];
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-semibold tracking-wide uppercase align-middle aspect-square rounded-full h-5 w-5 p-0 flex items-center justify-center",
        map.color
      )}
    >
      {source === "pubmed" ? (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden>
          <circle cx="4.5" cy="4.5" r="3.7" stroke="currentColor" strokeWidth="1.1"/>
          <path d="M3 4.5h3M4.5 3v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      ) : source === "pmc" ? (
        <BookmarkCheck className="size-3.5" />
      ) : (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden>
          <path d="M1.5 7.5L4.5 1.5L7.5 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
        </svg>
      )}
    </Badge>
  );
}

function PaperCard({
  paper,
  openId,
  onOpen,
}: {
  paper: PaperRow;
  openId: string | null;
  onOpen: (id: string) => void;
}) {
  const isOpen = paper._id === openId;
  const published = useMemo(
    () => formatJalaliDate(paper.publishedAtTimestamp),
    [paper.publishedAtTimestamp]
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(paper._id)}
      className={cn(
        "group relative flex w-full flex-col gap-2 rounded-xl border bg-card/70 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card shadow-sm backdrop-blur-sm",
        isOpen
          ? "border-primary/40 ring-2 ring-primary/25 shadow-md shadow-primary/10"
          : "border-transparent/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13.5px] leading-5 font-medium text-foreground">{paper.title}</p>
          {paper.journal && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{paper.journal}</p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground/70">{paper.authors.slice(0, 3).join(", ")}</span>
            {paper.authors.length > 3 && <span className="text-muted-foreground/60">...</span>}
            <span className="ml-auto flex items-center gap-1 text-muted-foreground/50">
              <Clock className="size-3" />
              {published}
            </span>
          </p>
        </div>
        <SourceChip source={paper.source} />
      </div>

      {/* Topics */}
      <div className="flex flex-wrap gap-1.5">
        {paper.topics.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
          >
            {t}
          </span>
        ))}
        {paper.topics.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{paper.topics.length - 3}</span>
        )}
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between border-t border-muted/40 pt-2 text-[10.5px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {paper.doi && (
            <a
              href={`https://doi.org/${encodeURIComponent(paper.doi)}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              DOI
            </a>
          )}
          {paper.pmid && (
            <span title={`PMID: ${paper.pmid}`} className="inline-flex items-center gap-1 text-muted-foreground/70">
              <Citation className="size-3" />
              PMID
            </span>
          )}
          {paper.pmcid && (
            <a
              href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${encodeURIComponent(paper.pmcid)}/}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-muted-foreground/70 hover:text-primary hover:underline"
            >
              <Bookmark className="size-3" />
              PMC
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {paper.citationCount > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground/70">
              <Citation className="size-3" />
              {faNum(paper.citationCount)}
            </span>
          )}
          {paper.isOpenAccess && (
            <Badge variant="secondary" className="h-5 px-2 text-[10px] font-medium text-foreground">
              Open Access
            </Badge>
          )}
          <span className="text-muted-foreground/40">
            <span className="inline-flex items-center gap-1">
              <Tag className="size-3" />
              {paper.topics.length}
            </span>
          </span>
        </div>
      </div>

      <motion.div
        className={cn(
          "absolute left-0 top-4 bottom-4 w-px -translate-x-full bg-gradient-to-b from-transparent via-primary/40 to-transparent transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        layoutId="paperFocus"
      />
    </button>
  );
}

function PaperDetailDialog({
  paper,
  open,
  onOpenChange,
  onSave,
}: {
  paper: PaperRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (paper: PaperRow) => void;
}) {
  if (!paper) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 sm:max-w-3xl">
        <div className="px-6 pb-6 pt-5">
          <DialogHeader>
            <DialogTitle className="leading-relaxed text-[15px] font-medium">
              {paper.title}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
            {paper.authors.map((a, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1 text-muted-foreground/40">·</span>}
                {a}
              </span>
            ))}
            {paper.journal && (
              <>
                <span className="mx-1 text-muted-foreground/40">·</span>
                <span>{paper.journal}</span>
              </>
            )}
            <span className="mx-1 text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground/50">
              <Clock className="size-3.5" />
              {formatJalaliDate(paper.publishedAtTimestamp)}
            </span>
            <span className="mx-1 text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground/50">
              <Citation className="size-3.5" />
              {faNum(paper.citationCount)} استناد
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <SourceChip source={paper.source} />
            {paper.doi && (
              <a
                href={`https://doi.org/${encodeURIComponent(paper.doi)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-muted"
              >
                DOI · {paper.doi}
                <ExternalLink className="ml-1 size-3" />
              </a>
            )}
            {paper.pmid && (
              <span className="rounded-full border border-muted bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                PMID {paper.pmid}
              </span>
            )}
            {paper.pmcid && (
              <a
                href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${encodeURIComponent(paper.pmcid)}/)`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-muted bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-muted"
              >
                PMC {paper.pmcid}
                <ExternalLink className="ml-1 size-3" />
              </a>
            )}
            {paper.isOpenAccess && (
              <Badge variant="secondary" className="text-[11px] font-medium">
                سوابق باز
              </Badge>
            )}
          </div>

          {/* Topics */}
          <div className="mt-4 flex flex-wrap gap-2">
            {paper.topics.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-3 py-1 text-[11.5px] font-medium text-primary"
              >
                <Tag className="mr-1.5 size-3.5 shrink-0" />
                {t}
              </span>
            ))}
          </div>

          {/* Summary if available */}
          {paper.summary && (
            <div className="mt-4 rounded-lg bg-muted/40 p-4 text-[13px] leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground mb-2">چکیدهٔ خلاصه‌شده</p>
              {paper.summary}
            </div>
          )}

          {/* Abstract */}
          {paper.abstract && (
            <div className="mt-4">
              <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <Citation className="size-4 text-primary" />
                چکیده (Abstract)
              </h3>
              <div className="min-h-[120px] rounded-lg bg-muted/30 p-4 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                {paper.abstract}
              </div>
            </div>
          )}

          {/* External links */}
          {(paper.fullTextUrl || paper.pdfUrl) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {paper.fullTextUrl && (
                <a
                  href={paper.fullTextUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-[12px] font-medium text-primary transition-colors hover:bg-primary/20 hover:text-primary"
                >
                  <ExternalLink className="size-3.5" />
                  متن کامل (Full Text)
                </a>
              )}
              {paper.pdfUrl && (
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-muted bg-muted/50 px-4 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Download className="size-3.5" />
                  دانلود PDF
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-muted/40 pt-4">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => onSave(paper)}
              className="gap-2"
            >
              <BookmarkCheck className="size-3.5" />
              ذخیره در کتابخانهٔ شخصی
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              بستن
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SourceStats {
  total: number;
  pubmed: number;
  pmc: number;
  elsevier: number;
  openAccess: number;
  avgCitations: number;
  recentDays: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<Record<string, unknown>>;
  label: string;
  value: string | number;
  sub?: string;
  accent: "primary" | "pubmed" | "pmc" | "elsevier";
}) {
  const accentClasses = {
    primary: "bg-primary/10 text-primary ring-primary/20",
    pubmed: "bg-blue-50 text-blue-700 ring-blue-200/40",
    pmc: "bg-emerald-50 text-emerald-700 ring-emerald-200/40",
    elsevier: "bg-violet-50 text-violet-700 ring-violet-200/40",
  }[accent];

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card/60 p-3 backdrop-blur-sm">
      <div className={cn("flex size-9 items-center justify-center rounded-lg", accentClasses)}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-[20px] font-bold tracking-tight text-foreground">
          {typeof value === "number" ? faNum(value) : value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
      </div>
    </div>
  );
}

// ─── صفحه اصلی ───────────────────────────────────────────────────────────────
function PubMedIcon() {
  return <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-blue-500" />;
}
function PmcIcon() {
  return <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-emerald-500" />;
}
function ElsevierIcon() {
  return <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-violet-500" />;
}

export default function ResearchLibraryPage() {
  const [sourceFilter, setSourceFilter] = useState<Source>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [openPaperId, setOpenPaperId] = useState<string | null>(null);

  // لیست مقالات
  const listResult = useQuery(api.research.listPapers, {
    limit: 120,
  });
  const allPapers = (listResult?.items ?? []) as PaperRow[];
  const totalCount = allPapers.length;

  // آمار کلی از listPapers به جای query جداگانه
  const stats = useMemo(() => {
    const items = allPapers;
    let pubmed = 0, pmc = 0, elsevier = 0, openAccess = 0, totalCitations = 0;
    let recent30Count = 0;
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    for (const p of items) {
      if (p.source === "pubmed") pubmed += 1;
      else if (p.source === "pmc") pmc += 1;
      else if (p.source === "elsevier") elsevier += 1;
      if (p.isOpenAccess) openAccess += 1;
      totalCitations += p.citationCount ?? 0;
      if (now - (p.publishedAtTimestamp ?? 0) < thirtyDays) recent30Count += 1;
    }
    return {
      totalCount: items.length,
      pubmedCount: pubmed,
      pmcCount: pmc,
      elsevierCount: elsevier,
      openAccessCount: openAccess,
      totalCitations,
      avgCitationCount: items.length ? totalCitations / items.length : 0,
      recent30Count,
      savedCount: 0,
    };
  }, [allPapers]);

  // Prefetch one paper for the detail dialog (only when an id is selected)
  const prefetched = useQuery(
    api.research.getPaper,
    openPaperId ? { id: openPaperId as Id<"researchPapers"> } : "skip"
  );


  const openPaper = useMemo((): PaperRow | null => {
    if (!openPaperId || !prefetched) return null;
    const paper = prefetched.paper;
    return {
      _id: openPaperId,
      title: paper?.title ?? "",
      authors: Array.isArray(paper?.authors) ? paper.authors : [],
      journal: paper?.journal,
      citationCount: paper?.citationCount ?? 0,
      publishedAtTimestamp: paper?.publishedAtTimestamp ? Number(paper.publishedAtTimestamp) : 0,

      source: (paper?.source ?? "pubmed") as PaperRow["source"],
      isOpenAccess: paper?.isOpenAccess ?? false,
      doi: paper?.doi,
      pmid: paper?.pmid,
      pmcid: paper?.pmcid,
      topics: Array.isArray(paper?.topics) ? paper.topics : [],
      summary: paper?.summary ?? null,
      abstract: paper?.abstract ?? null,
      fullTextUrl: paper?.fullTextUrl ?? null,
      pdfUrl: paper?.pdfUrl ?? null,
      relatedIds: paper?.relatedIds ?? null,
    };
  }, [openPaperId, prefetched]);


  const filtered = useMemo(() => {
    if (!Array.isArray(allPapers)) return [];
    let list: PaperRow[] = allPapers;

    if (sourceFilter !== "all") {
      list = list.filter((p) => p.source === sourceFilter);
    }

    list = [...list].sort((a, b) => {
      if (sortKey === "newest") return b.publishedAtTimestamp - a.publishedAtTimestamp;
      if (sortKey === "citation") return b.citationCount - a.citationCount;
      // title
      return a.title.localeCompare(b.title, "fa");
    });

    return list;
  }, [allPapers, sourceFilter, sortKey]);

  const shownCount = filtered.length;

  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top_right,rgba(5,150,105,0.12),transparent_60%)]">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-muted/40 bg-card/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <a
            href="/virtual-lab"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            بازگشت به آزمایشگاه مجازی
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/research-saved"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <BookmarkCheck className="size-3.5" />
              ذخیره‌شده ({stats?.savedCount ?? 0})
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-card/40 py-14 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,150,105,0.08),transparent_60%)]" />
        <div className="absolute inset-x-0 top-10 h-px bg-gradient-to-l from-primary/20 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <BookOpen className="size-3.5" />
            کتابخانهٔ پژوهشی
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            دسترسی به آخرین یافته‌های
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-teal-300 bg-clip-text text-transparent">
              پژوهشی علوم زیستی
            </span>
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            منابع آزمایشگاهی عمومی · به‌روز رسانی خودکار روزانه
          </p>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            مجموعه‌ای از مقالات معتبر از PubMed، PMC و Elsevier با استناد به داده‌های ساختاریافته
            و دسته‌بندی خودکار بر اساس موضوعات پژوهشی. جستجو، فیلتر و ذخیره آنلاین.
          </p>

          {/* Quick stats row */}
          {stats && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatCard
                icon={BookOpen}
                label="تعداد کل"
                value={faNum(stats.totalCount)}
                sub="مقالات لیست‌شده"
                accent="primary"
              />
              <StatCard
                icon={PubMedIcon}
                label="PubMed"
                value={faNum(stats.pubmedCount)}
                sub={`شامل ${faNum(stats.recent30Count)} مقالهٔ ۳۰ روز اخیر`}
                accent="pubmed"
              />
              <StatCard
                icon={PmcIcon}
                label="PMC"
                value={faNum(stats.pmcCount)}
                sub="متن کامل در دسترس"
                accent="pmc"
              />
              <StatCard
                icon={ElsevierIcon}
                label="Elsevier"
                value={faNum(stats.elsevierCount)}
                sub="در صورتinisialisasi کلید API"
                accent="elsevier"
              />
              <StatCard
                icon={Citation}
                label="استنادمتوسط"
                value={stats.avgCitationCount > 0 ? faNum(Math.round(stats.avgCitationCount)) : "—"}
                sub={`تعداد کل استنادها: ${faNum(stats.totalCitations)}`}
                accent="primary"
              />
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-[73px] z-10 border-b border-muted/30 bg-card/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-[12px] font-medium text-muted-foreground">فیلترها:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Source filter */}
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as Source)}>
              <SelectTrigger className="w-[140px] h-8 text-[12px]">
                <SelectValue placeholder="منبع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه منابع</SelectItem>
                <SelectItem value="pubmed">فقط PubMed</SelectItem>
                <SelectItem value="pmc">فقط PMC</SelectItem>
                <SelectItem value="elsevier">فقط Elsevier</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[150px] h-8 text-[12px]">
                <SelectValue placeholder="مرتب‌سازی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">جدیدترین</SelectItem>
                <SelectItem value="citation">پربحث‌ترین</SelectItem>
                <SelectItem value="title">نام‌محور (الفبایی)</SelectItem>
              </SelectContent>
            </Select>

            {/* Result count */}
            <span className="text-[11px] text-muted-foreground">
              نمایش {shownCount} از {allPapers.length} مقاله
            </span>
            <button
              type="button"
              onClick={() => {
                // Refresh not wired — placeholder
                window.location.reload();
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-muted/40 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
            >
              <RefreshCw className="size-3" />
              تازه‌سازی
            </button>
          </div>
        </div>
      </section>

      {/* Paper grid */}
      <main className="flex-1 px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          {!allPapers ? (
            <div className="mx-auto max-w-2xl space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 rounded-xl border bg-card/50 p-4">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-muted bg-card/50 p-10 text-center">
              <BookOpen className="mx-auto mb-3 size-10 text-muted-foreground/30" />
              <h3 className="text-[13px] font-semibold text-foreground">مقاله‌ای یافت نشد</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                با تغییر فیلترها یا بازگشت به منابع پیش‌فرض، مقالات بیشتری را ببینید.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((paper) => (
                <PaperCard
                  key={paper._id}
                  paper={paper}
                  openId={openPaperId}
                  onOpen={setOpenPaperId}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-muted/30 bg-card/40 py-4 text-center text-[11px] text-muted-foreground">
        کتابخانهٔ پژوهشی · آپدیت خودکار روزانه · منابع: PubMed, PMC, Elsevier
      </footer>

      {/* Detail dialog */}
      <PaperDetailDialog
        paper={openPaper}
        open={!!openPaperId}
        onOpenChange={(open) => {
          if (!open) setOpenPaperId(null);
        }}
        onSave={(paper) => {
          // Save and close — actual mutation wired via Convex in next step
          window.location.href = "/research-saved";
        }}
      />
    </div>
  );
}

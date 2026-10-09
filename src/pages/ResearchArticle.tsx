import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { SOURCE_LABELS } from "@/convex/researchAdapters";
import { BookOpen, Bookmark, BookmarkCheck, ExternalLink, Link as LinkIcon, FileText, Globe, Users, Calendar, Tag, Columns } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ResearchArticle() {
  const { id } = useParams<{ id: string }>();
  const idId = useMemo(() => (typeof id === "string" && id ? (id as Id<"researchPapers">) : null), [id]);
  const { paper, isSaved } = useQuery(api.research.getPaper, idId ? { id: idId } : "skip") ?? {};
  const toggle = useMutation(api.research.toggleSavedPaper);

  if (!paper) {
    return (
      <div className="flex min-h-screen flex-col bg-[#eef5f2] px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-4 w-48 mb-8" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const { title, journal, publicationDate, doi, pmid, pmcid, isOpenAccess, sources, abstract, genovaSummary, keyFindings, topics, keywords, authors, articleType, externalId, sourceUrl } = paper;
  const year = publicationDate ? new Date(publicationDate).getUTCFullYear() : null;

  const handleToggle = async () => {
    if (!idId) return;
    const res = await toggle({ paperId: idId, source: "research" });
    toast.success(res.saved ? "مقاله ذخیره شد" : "از ذخیره حذف شد");
  };

  const sourceEntries = Array.isArray(sources) ? sources : [];
  const pmcSource = (sourceEntries.find((s) => s.type === "pmc") ?? null) as { url?: string; id?: string; type?: string } | null;
  const pubmedSource = (sourceEntries.find((s) => s.type === "pubmed") ?? null) as { url?: string; id?: string; type?: string } | null;
  const elsevierSource = (sourceEntries.find((s) => s.type === "elsevier") ?? null) as { url?: string; id?: string; type?: string } | null;

  return (
    <div className="flex min-h-screen flex-col bg-[#eef5f2] px-4 py-6 lg:px-8">
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl">
          {/* Back */}
          <a
            href="/virtual-lab/research"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-700"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            بازگشت به کتابخانه
          </a>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="line-clamp-3 text-xl font-extrabold leading-7 text-slate-900">
              {title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {journal && (
                <span className="flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1">
                  <Columns className="size-3.5" />
                  {journal}
                </span>
              )}
              {year && (
                <span className="flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1">
                  <Calendar className="size-3.5" />
                  {year}
                </span>
              )}
              {articleType && (
                <Badge variant="outline" className="text-xs">{articleType}</Badge>
              )}
              {isOpenAccess && (
                <Badge className="bg-emerald-100 text-emerald-700">Open Access</Badge>
              )}
            </div>

            {authors && (
              <p className="mt-2 text-sm text-slate-600">
                <Users className="inline size-4 mr-1 text-slate-400" />
                {authors}
              </p>
            )}

            {/* Source badges */}
            <div className="mt-3 flex flex-wrap gap-2">
              {sourceEntries.map((s: any, i: number) => (
            <Badge key={`${s.type}-${i}`} variant="secondary" className="cursor-pointer gap-1.5 transition-colors hover:bg-slate-100">
              {SOURCE_LABELS[s.type as keyof typeof SOURCE_LABELS] ?? s.type}
              <ExternalLink className="size-3" />
            </Badge>
              ))}
            </div>

            {/* IDs */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
              {pmid && <span>PMID: {pmid}</span>}
              {pmcid && <span>PMCID: {pmcid}</span>}
              {doi && <span>DOI: {doi}</span>}
              {externalId && <span>ExtID: {externalId}</span>}
            </div>
          </motion.div>

          {/* Action row */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              className={cn(isSaved ? "bg-amber-600 hover:bg-amber-700" : "border-amber-300 text-amber-700 hover:bg-amber-50")}
              onClick={handleToggle}
            >
              {isSaved
                ? <BookmarkCheck className="mr-1.5 size-4" />
                : <Bookmark className="mr-1.5 size-4" />
              }
              {isSaved ? "ذخیره‌شده" : "ذخیره‌سازی"}
            </Button>

            {sourceEntries.map((s: any) => (
              <a
                key={s.type}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
              >
                {SOURCE_LABELS[s.type as keyof typeof SOURCE_LABELS] ?? s.type}
                <ExternalLink className="size-3" />
              </a>
            ))}

            {doi && (
              <a
                href={`https://doi.org/${doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
              >
                <LinkIcon className="size-3" />
                مقاله اصلی (DOI)
              </a>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Left column: summary + abstract */}
            <div className="sm:col-span-2 space-y-6">
              {/* Genova Summary */}
              {genovaSummary && (
                <div className="rounded-2xl border border-emerald-900/8 bg-emerald-50/60 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
                      <BookOpen className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">خلاصهٔ ژنوا</h2>
                      <p className="text-[10.5px] text-slate-500">تولیده توسط هوش مصنوعی · مبتنی بر چکیده</p>
                    </div>
                  </div>
                  <p className="leading-relaxed text-sm text-slate-700">{genovaSummary}</p>
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[10.5px] text-amber-700">
                    <svg className="mt-0.5 shrink-0 size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    این خلاصه با هوش مصنوعی تولید شده است. برای تصمیم‌گیری‌های علمی، مقاله اصلی را مطالعه کنید.
                  </p>
                </div>
              )}

              {/* Key Findings */}
              {keyFindings && keyFindings.length > 0 && (
                <div className="rounded-2xl border border-emerald-900/8 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">یافته‌های کلیدی</h2>
                      <p className="text-[10.5px] text-slate-500">استخراج‌شده از چکیده</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {keyFindings.map((f: string, i: number) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <p className="text-sm text-slate-600 leading-relaxed">{f}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Abstract */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shadow-sm">
                    <Globe className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">چکیده (Abstract)</h2>
                    <p className="text-[10.5px] text-slate-500">از منبع اصلی</p>
                  </div>
                </div>
                <div className="leading-relaxed text-sm text-slate-600">
                  {abstract
                    ? abstract
                    : <p className="italic text-slate-400">چکیده در دسترس نیست. لطفاً مقاله اصلی را بررسی کنید.</p>}
                </div>
              </div>

              {/* Topics */}
              {topics && topics.length > 0 && (
                <div className="rounded-2xl border border-emerald-900/8 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
                      <Tag className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">موضوعات</h2>
                      <p className="text-[10.5px] text-slate-500">طبقه‌بندی ژنوا</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map((t: string) => (
                      <Badge key={t} variant="outline" className="text-xs border-emerald-200 text-emerald-700">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column: external links detail */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-slate-900">منابع خارجی</h2>
                <div className="space-y-2">
                  {pubmedSource && (
                    <a
                      href={pubmedSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 transition-colors hover:bg-emerald-50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                          <path d="M19 5h-2.5l-1.5-5H7.5L6 5H3a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2zm0 14H3V7h16v12zM7 5h10v2h-10z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">PubMed</p>
                        <p className="text-xs text-slate-500">{pubmedSource.id}</p>
                        <p className="mt-1 text-[10.5px] text-slate-400">
                          <ExternalLink className="inline size-3 mr-0.5" />
                          مشاهده در PubMed
                        </p>
                      </div>
                    </a>
                  )}
                  {pmcSource && (
                    <a
                      href={pmcSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 transition-colors hover:bg-emerald-50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
                        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                          <path d="M12 2L2 7l10 5 10-5-10-5zm0 10.5l4.25-2.125 4.25 2.125-4.25 2.125L12 19.5z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">PMC</p>
                        <p className="text-xs text-slate-500">{pmcSource.id ?? "PMC"}</p>
                        <p className="mt-1 text-[10.5px] text-slate-400">
                          <ExternalLink className="inline size-3 mr-0.5" />
                          متن کامل (Open Access)
                        </p>
                      </div>
                    </a>
                  )}
                  {elsevierSource && (
                    <a
                      href={elsevierSource.url ?? `https://doi.org/${elsevierSource.id ?? ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 transition-colors hover:bg-emerald-50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#003087] text-white shadow-sm">
                        <span className="font-bold text-[10px]">SD</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">ScienceDirect</p>
                        <p className="text-xs text-slate-500">{elsevierSource.id}</p>
                        <p className="mt-1 text-[10.5px] text-slate-400">
                          <ExternalLink className="inline size-3 mr-0.5" />
                          مقاله اصلی
                        </p>
                      </div>
                    </a>
                  )}
                </div>
              </div>

              {/* Metadata card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-slate-900">ویرایش‌شده</h2>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-500"> 동력으로 작동하는</dt>
                    <dd className="text-slate-700 font-medium">{year ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">نوع مقاله</dt>
                    <dd className="text-slate-700 font-medium">{articleType ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">دسترسی باز</dt>
                    <dd className="text-slate-700 font-medium">{isOpenAccess ? "بله" : "خیر"}</dd>
                  </div>
                  {sources && sources.length > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">منابع</dt>
                      <dd className="text-slate-700 font-medium">{sources.length}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

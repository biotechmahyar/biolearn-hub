import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";

// ═══════════════════════════════════════════════════════════════════════════
//  DEDUPLICATION
//  Genova is a discovery gateway, not a publisher: one physical article that
//  appears in PubMed, PMC and ScienceDirect must resolve to ONE document.
//  Priority: DOI > PMID > PMCID > normalized title + journal + year.
// ═══════════════════════════════════════════════════════════════════════════

/** Stable dedup key. Strongest identifier wins. */
export function paperDedupKey(meta: {
  doi?: string | null;
  pmid?: string | null;
  pmcid?: string | null;
  title: string;
  journal?: string | null;
  publicationDate?: number | undefined;
}): string {
  const doi = (meta.doi ?? "").trim().toLowerCase();
  if (doi) return `doi:${doi}`;
  const pmid = (meta.pmid ?? "").trim();
  if (pmid) return `pmid:${pmid}`;
  const pmcid = (meta.pmcid ?? "").trim().toUpperCase();
  if (pmcid) return `pmcid:${pmcid}`;

  const year =
    meta.publicationDate != null
      ? String(new Date(meta.publicationDate).getUTCFullYear())
      : "";
  const norm = [
    (meta.title ?? "").trim().toLowerCase(),
    (meta.journal ?? "").trim().toLowerCase(),
    year,
  ]
    .filter(Boolean)
    .join("|");
  let h = 0;
  for (let i = 0; i < norm.length; i++) h = (h * 31 + norm.charCodeAt(i)) | 0;
  return `title:${String(h >>> 0).slice(0, 10)}:${year}`;
}

/** Lowercase, punctuation-stripped title used for display-level comparisons. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

/**
 * Concatenated, lowercased blob powering the `search` index:
 * title, authors, journal, publisher, keywords, topics, identifiers, abstract.
 */
export function buildSearchText(meta: {
  title: string;
  authors?: string | undefined;
  journal?: string | undefined;
  publisher?: string | undefined;
  keywords?: string[] | undefined;
  topics?: string[] | undefined;
  doi?: string | undefined;
  pmid?: string | undefined;
  pmcid?: string | undefined;
  articleType?: string | undefined;
  abstract?: string | undefined;
}): string {
  return [
    meta.title,
    meta.authors,
    meta.journal,
    meta.publisher,
    (meta.keywords ?? []).join(" "),
    (meta.topics ?? []).join(" "),
    meta.doi,
    meta.pmid,
    meta.pmcid,
    meta.articleType,
    (meta.abstract ?? "").slice(0, 4000),
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase()
    .slice(0, 9000);
}

type SourceEntry = { type: string; id?: string | undefined; url?: string | undefined };

/** Fields an adapter hands to the ingestion pipeline. */
export const ingestArticleArgs = {
  title: v.string(),
  normalizedTitle: v.string(),
  searchText: v.optional(v.string()),
  authors: v.optional(v.string()),
  journal: v.optional(v.string()),
  journalId: v.optional(v.string()),
  publisher: v.optional(v.string()),
  articleType: v.optional(v.string()),
  publicationDate: v.optional(v.number()),
  doi: v.optional(v.string()),
  pmid: v.optional(v.string()),
  pmcid: v.optional(v.string()),
  externalId: v.optional(v.string()),
  isOpenAccess: v.optional(v.boolean()),
  license: v.optional(v.string()),
  abstract: v.optional(v.string()),
  genovaSummary: v.optional(v.string()),
  keyFindings: v.optional(v.array(v.string())),
  topics: v.optional(v.array(v.string())),
  keywords: v.optional(v.array(v.string())),
  source: v.string(),
  sourceId: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  citationCount: v.optional(v.number()),
  imageUrl: v.optional(v.string()),
  imageLicense: v.optional(v.string()),
};

/** Find an existing document for this article using the identifier priority. */
async function findExisting(
  ctx: MutationCtx,
  args: {
    doi?: string | undefined;
    pmid?: string | undefined;
    pmcid?: string | undefined;
    dedupKey: string;
  },
): Promise<Doc<"researchPapers"> | null> {
  if (args.doi) {
    const hit = await ctx.db
      .query("researchPapers")
      .withIndex("by_doi", (q) => q.eq("doi", args.doi!))
      .first();
    if (hit) return hit;
  }
  if (args.pmid) {
    const hit = await ctx.db
      .query("researchPapers")
      .withIndex("by_pmid", (q) => q.eq("pmid", args.pmid!))
      .first();
    if (hit) return hit;
  }
  if (args.pmcid) {
    const hit = await ctx.db
      .query("researchPapers")
      .withIndex("by_pmcid", (q) => q.eq("pmcid", args.pmcid!))
      .first();
    if (hit) return hit;
  }
  return await ctx.db
    .query("researchPapers")
    .withIndex("by_externalId", (q) => q.eq("externalId", args.dedupKey))
    .first();
}

/**
 * Core upsert used by the ingestion pipeline (actions run this through
 * `internal.research.ingestBatch`). Merges duplicate sources into one row.
 */
export async function ingestOne(
  ctx: MutationCtx,
  args: {
    title: string;
    normalizedTitle: string;
    searchText?: string | undefined;
    authors?: string | undefined;
    journal?: string | undefined;
    journalId?: string | undefined;
    publisher?: string | undefined;
    articleType?: string | undefined;
    publicationDate?: number | undefined;
    doi?: string | undefined;
    pmid?: string | undefined;
    pmcid?: string | undefined;
    externalId?: string | undefined;
    isOpenAccess?: boolean | undefined;
    license?: string | undefined;
    abstract?: string | undefined;
    genovaSummary?: string | undefined;
    keyFindings?: string[] | undefined;
    topics?: string[] | undefined;
    keywords?: string[] | undefined;
    source: string;
    sourceId?: string | undefined;
    sourceUrl?: string | undefined;
    citationCount?: number | undefined;
    imageUrl?: string | undefined;
    imageLicense?: string | undefined;
  },
): Promise<{ inserted: boolean; merged: boolean }> {
  const now = Date.now();
  const dedupKey = paperDedupKey(args);
  const existing = await findExisting(ctx, {
    doi: args.doi,
    pmid: args.pmid,
    pmcid: args.pmcid,
    dedupKey,
  });

  const sourceEntry: SourceEntry = {
    type: args.source,
    id: args.sourceId?.trim() || undefined,
    url: args.sourceUrl?.trim() || undefined,
  };

  if (existing) {
    const sources = [...(existing.sources ?? [])];
    const alreadyThere = sources.some(
      (s) => s.type === sourceEntry.type && (s.id ?? "") === (sourceEntry.id ?? ""),
    );
    const patch: Partial<Doc<"researchPapers">> = { updatedAt: now };
    if (!alreadyThere) sources.push(sourceEntry);
    patch.sources = sources;
    // Backfill identifiers discovered by later sources so future lookups hit
    // the stronger index instead of the title fallback.
    if (!existing.doi && args.doi) patch.doi = args.doi;
    if (!existing.pmid && args.pmid) patch.pmid = args.pmid;
    if (!existing.pmcid && args.pmcid) patch.pmcid = args.pmcid;
    if (existing.isOpenAccess !== true && args.isOpenAccess === true)
      patch.isOpenAccess = true;
    if (!existing.abstract && args.abstract) patch.abstract = args.abstract;
    if (!existing.genovaSummary && args.genovaSummary)
      patch.genovaSummary = args.genovaSummary;
    if ((!existing.keyFindings || existing.keyFindings.length === 0) && args.keyFindings)
      patch.keyFindings = args.keyFindings;
    if (!existing.license && args.license) patch.license = args.license;
    if (args.citationCount != null) patch.citationCount = args.citationCount;
    // Keep the merged keyword/topic/search surface in sync.
    const topics = Array.from(
      new Set([...(existing.topics ?? []), ...(args.topics ?? [])]),
    ).slice(0, 40);
    const keywords = Array.from(
      new Set([...(existing.keywords ?? []), ...(args.keywords ?? [])]),
    ).slice(0, 40);
    if (topics.length !== (existing.topics ?? []).length) patch.topics = topics;
    if (keywords.length !== (existing.keywords ?? []).length) patch.keywords = keywords;
    patch.ingestStatus = "processed";
    patch.searchText = buildSearchText({
      title: existing.title,
      authors: patch.authors ?? existing.authors,
      journal: patch.journal ?? existing.journal,
      publisher: patch.publisher ?? existing.publisher,
      keywords,
      topics,
      doi: patch.doi ?? existing.doi,
      pmid: patch.pmid ?? existing.pmid,
      pmcid: patch.pmcid ?? existing.pmcid,
      articleType: existing.articleType,
      abstract: patch.abstract ?? existing.abstract,
    });
    await ctx.db.patch(existing._id, patch);
    return { inserted: false, merged: true };
  }

  const id = await ctx.db.insert("researchPapers", {
    externalId: dedupKey,
    title: args.title.trim().slice(0, 600),
    normalizedTitle: args.normalizedTitle || normalizeTitle(args.title),
    searchText:
      args.searchText ??
      buildSearchText({
        title: args.title,
        authors: args.authors,
        journal: args.journal,
        publisher: args.publisher,
        keywords: args.keywords,
        topics: args.topics,
        doi: args.doi,
        pmid: args.pmid,
        pmcid: args.pmcid,
        articleType: args.articleType,
        abstract: args.abstract,
      }),
    authors: args.authors?.trim().slice(0, 500) || undefined,
    journal: args.journal?.trim().slice(0, 200) || undefined,
    journalId: args.journalId?.trim() || undefined,
    publisher: args.publisher?.trim().slice(0, 200) || undefined,
    articleType: args.articleType?.trim().slice(0, 120) || undefined,
    publicationDate: args.publicationDate,
    doi: args.doi?.trim() || undefined,
    pmid: args.pmid?.trim() || undefined,
    pmcid: args.pmcid?.trim() || undefined,
    isOpenAccess: args.isOpenAccess ?? args.source === "pmc",
    license: args.license?.trim() || undefined,
    abstract: args.abstract?.trim().slice(0, 12000) || undefined,
    genovaSummary: args.genovaSummary?.trim().slice(0, 3000) || undefined,
    keyFindings: (args.keyFindings ?? []).map((k) => k.trim().slice(0, 400)).slice(0, 8),
    topics: (args.topics ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 40),
    keywords: (args.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 40),
    source: args.source,
    sourceUrl: args.sourceUrl?.trim().slice(0, 2000) || undefined,
    sources: [sourceEntry],
    citationCount: args.citationCount,
    imageUrl: args.imageUrl?.trim() || undefined,
    imageLicense: args.imageLicense?.trim() || undefined,
    ingestStatus: "processed",
    createdAt: now,
    updatedAt: now,
  });
  void id;
  return { inserted: true, merged: false };
}

// ═══════════════════════════════════════════════════════════════════════════
//  INTERNAL — called by the ingestion actions (researchIngest.ts)
// ═══════════════════════════════════════════════════════════════════════════

/** Batch upsert from adapters. Returns per-batch counts. */
export const ingestBatch = internalMutation({
  args: { articles: v.array(v.object(ingestArticleArgs)) },
  handler: async (ctx, args) => {
    let inserted = 0;
    let merged = 0;
    let failed = 0;
    for (const article of args.articles) {
      try {
        if (!article.title || !article.title.trim()) {
          failed++;
          continue;
        }
        const result = await ingestOne(ctx, { ...article });
        if (result.inserted) inserted++;
        else if (result.merged) merged++;
      } catch {
        failed++;
      }
    }
    return { inserted, merged, failed, total: args.articles.length };
  },
});

/** Persist one adapter fetch cycle (one row per source per run). */
export const logSync = internalMutation({
  args: {
    source: v.string(),
    status: v.string(),
    message: v.optional(v.string()),
    count: v.optional(v.number()),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    return await ctx.db.insert("researchSyncLogs", {
      source: args.source,
      status: args.status,
      message: args.message,
      count: args.count,
      errorCode: args.errorCode,
      runBy: user?._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Toggle save (bookmark) for the signed-in user. */
export const toggleSavedPaper = mutation({
  args: {
    paperId: v.id("researchPapers"),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ذخیره‌سازی ابتدا وارد حساب شوید.");

    const existing = await ctx.db
      .query("savedPapers")
      .withIndex("by_user_paper", (q) =>
        q.eq("userId", user._id).eq("paperId", args.paperId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }

    await ctx.db.insert("savedPapers", {
      userId: user._id,
      paperId: args.paperId,
      source: args.source,
      createdAt: Date.now(),
    });
    return { saved: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC QUERIES
// ═══════════════════════════════════════════════════════════════════════════

type PaperRow = Doc<"researchPapers">;

function matchesFilters(
  row: PaperRow,
  args: {
    source?: string | undefined;
    openAccessOnly?: boolean | undefined;
    articleType?: string | undefined;
    yearFrom?: number | undefined;
    yearTo?: number | undefined;
    topics?: string[] | undefined;
  },
): boolean {
  if (args.openAccessOnly && !row.isOpenAccess) return false;
  if (args.articleType && row.articleType !== args.articleType) return false;
  if (args.source) {
    const inAny =
      row.source === args.source ||
      (row.sources ?? []).some((s) => s.type === args.source);
    if (!inAny) return false;
  }
  if (args.yearFrom != null || args.yearTo != null) {
    const y = row.publicationDate
      ? new Date(row.publicationDate).getUTCFullYear()
      : null;
    if (y == null) return false;
    if (args.yearFrom != null && y < args.yearFrom) return false;
    if (args.yearTo != null && y > args.yearTo) return false;
  }
  if (args.topics && args.topics.length > 0) {
    if (!args.topics.some((t) => (row.topics ?? []).includes(t))) return false;
  }
  return true;
}

const MAX_SCAN = 900; // bounded scan window — never load the whole corpus

/**
 * Paginated listing/search over the Research Library.
 *
 * - With `q`: uses the `search` index (searchText: title+authors+journal+
 *   keywords+topics+identifiers+abstract), relevance-ordered.
 * - Without `q`: uses `by_created` index, newest/oldest ordered.
 * - Multi-valued filters (source membership, topics) are applied in JS over a
 *   bounded scan window; offset-based "load more" pagination on top.
 */
export const listPapers = query({
  args: {
    q: v.optional(v.string()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
    source: v.optional(v.string()),
    openAccessOnly: v.optional(v.boolean()),
    articleType: v.optional(v.string()),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
    topics: v.optional(v.array(v.string())),
    sort: v.optional(v.string()), // "relevance" | "newest" | "oldest"
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 48);
    const offset = Math.max(args.offset ?? 0, 0);
    const sort = args.sort ?? ((args.q ?? "").trim() ? "relevance" : "newest");
    const term = (args.q ?? "").trim();
    const scanCap = Math.min(offset + limit + 1 + 120, MAX_SCAN);

    let raw: PaperRow[];
    if (term) {
      let search = ctx.db
        .query("researchPapers")
        .withSearchIndex("search", (sq) => {
          let expr = sq.search("searchText", term);
          if (args.articleType) expr = expr.eq("articleType", args.articleType);
          if (args.openAccessOnly) expr = expr.eq("isOpenAccess", true);
          return expr;
        });
      // Year/topic/source filters are applied in JS below (bounded window).
      raw = await search.take(scanCap);
    } else {
      let list = ctx.db
        .query("researchPapers")
        .withIndex("by_created", (q) => q)
        .order(sort === "oldest" ? "asc" : "desc");
      raw = await list.take(scanCap);
    }

    let matched = raw.filter((row) => matchesFilters(row, args));

    if (sort === "newest" || sort === "oldest") {
      const dir = sort === "oldest" ? 1 : -1;
      matched = matched.slice().sort((a, b) => {
        const av = a.publicationDate ?? a.createdAt;
        const bv = b.publicationDate ?? b.createdAt;
        return (av - bv) * dir;
      });
    }

    const page = matched.slice(offset, offset + limit);
    const hasMore =
      matched.length > offset + limit ||
      (raw.length >= scanCap && matched.length <= offset + limit);

    return { items: page, offset, limit, hasMore, sort };
  },
});

/** One paper by document id + whether the current user saved it. */
export const getPaper = query({
  args: { id: v.id("researchPapers") },
  handler: async (ctx, args) => {
    const paper = await ctx.db.get(args.id);
    if (!paper) return null;
    const user = await getCurrentUser(ctx);
    let isSaved = false;
    if (user) {
      const saved = await ctx.db
        .query("savedPapers")
        .withIndex("by_user_paper", (q) =>
          q.eq("userId", user._id).eq("paperId", args.id),
        )
        .first();
      isSaved = !!saved;
    }
    return { paper, isSaved };
  },
});

/** Related papers: shares at least one topic/keyword with the given paper. */
export const relatedPapers = query({
  args: { id: v.id("researchPapers"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 4, 8);
    const paper = await ctx.db.get(args.id);
    if (!paper) return [];
    const seeds = new Set([
      ...(paper.topics ?? []).map((t) => t.toLowerCase()),
      ...(paper.keywords ?? []).map((k) => k.toLowerCase()),
    ]);
    if (seeds.size === 0) return [];

    const candidates = await ctx.db
      .query("researchPapers")
      .withIndex("by_created", (q) => q)
      .order("desc")
      .take(400);

    const scored = candidates
      .filter((c) => c._id !== paper._id)
      .map((c) => {
        let score = 0;
        for (const t of c.topics ?? [])
          if (seeds.has(t.toLowerCase())) score += 2;
        for (const k of c.keywords ?? [])
          if (seeds.has(k.toLowerCase())) score += 1;
        if (score > 0 && c.journal && c.journal === paper.journal) score += 1;
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (b.c.createdAt - a.c.createdAt));

    return scored.slice(0, limit).map((x) => x.c);
  },
});

/** Latest N papers (dashboard strip). */
export const latestPapers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 12, 40);
    return await ctx.db
      .query("researchPapers")
      .withIndex("by_created", (q) => q)
      .order("desc")
      .take(limit);
  },
});

/** Popular topics = canonical topic → count across a bounded recent window. */
export const popularTopics = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 14, 40);
    const counts: Record<string, number> = {};
    const rows = await ctx.db
      .query("researchPapers")
      .withIndex("by_created", (q) => q)
      .order("desc")
      .take(500);
    for (const row of rows) {
      for (const t of row.topics ?? []) counts[t] = (counts[t] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
});

/** Ids saved by the current user (lightweight, for card bookmark state). */
export const savedIds = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("savedPapers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(500);
    return rows.map((r) => r.paperId);
  },
});

/** Saved papers joined with their documents, newest bookmark first. */
export const mySavedPapers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const limit = Math.min(args.limit ?? 60, 200);
    const rows = await ctx.db
      .query("savedPapers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
    const out: { savedAt: number; paper: PaperRow }[] = [];
    for (const r of rows) {
      const paper = await ctx.db.get(r.paperId);
      if (paper) out.push({ savedAt: r.createdAt, paper });
    }
    return out;
  },
});

/** Last-known status per source (drives the Research Sources card). */
export const syncStatus = query({
  args: {},
  handler: async (ctx) => {
    const out: Record<
      string,
      {
        lastStatus: string;
        lastMessage: string;
        lastCount: number | null;
        lastRun: number | null;
      }
    > = {};
    const rows = await ctx.db
      .query("researchSyncLogs")
      .withIndex("by_created", (q) => q)
      .order("desc")
      .take(120);
    for (const r of rows) {
      if (!out[r.source]) {
        out[r.source] = {
          lastStatus: r.status,
          lastMessage: r.message ?? "",
          lastCount: r.count ?? null,
          lastRun: r.createdAt,
        };
      }
    }
    return out;
  },
});

/** Small dashboard stats block. */
export const researchStats = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("researchPapers")
      .withIndex("by_created", (q) => q)
      .order("desc")
      .take(1000);
    const bySource: Record<string, number> = {};
    let openAccess = 0;
    for (const r of rows) {
      for (const s of r.sources ?? [{ type: r.source }]) {
        bySource[s.type] = (bySource[s.type] ?? 0) + 1;
      }
      if (r.isOpenAccess) openAccess++;
    }
    const user = await getCurrentUser(ctx);
    let savedCount = 0;
    if (user) {
      const saved = await ctx.db
        .query("savedPapers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(500);
      savedCount = saved.length;
    }
    return {
      total: rows.length,
      openAccess,
      bySource,
      savedCount,
      newestAt: rows[0]?.createdAt ?? null,
    };
  },
});

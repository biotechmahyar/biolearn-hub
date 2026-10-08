import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Deterministic deduplication key for a paper.
 *
 * Priority: DOI > PMID > PMCID > normalised title+journal+year hash.
 * The key is stable across sources, so the same article found in PubMed, PMC
 * and ScienceDirect maps to one researchPapers document.
 */
export function paperDedupKey(meta: {
  doi?: string | null;
  pmid?: string | null;
  pmcid?: string | null;
  title: string;
  journal?: string | null;
  publicationDate?: number | undefined;
}): string {
  const doi = (meta.doi ?? "").trim();
  if (doi) return `doi:${doi.toLowerCase()}`;

  const pmid = (meta.pmid ?? "").trim();
  if (pmid) return `pmid:${pmid}`;

  const pmcid = (meta.pmcid ?? "").trim();
  if (pmcid) return `pmcid:${pmcid}`;

  const year =
    meta.publicationDate != null
      ? String(Math.floor((meta.publicationDate / 1000) | 0))
      : "";
  const norm = [
    (meta.title ?? "").trim().toLowerCase(),
    (meta.journal ?? "").trim().toLowerCase(),
    year,
  ]
    .filter(Boolean)
    .join("|");

  let h = 0;
  for (let i = 0; i < norm.length; i++) {
    h = ((h * 31) + norm.charCodeAt(i)) | 0;
  }
  const short = String(h >>> 0).slice(0, 10);
  return `title:${short}:${year}`;
}

// ── MUTATIONS ──────────────────────────────────────────────────────────────

/**
 * Normalise + upsert one research-paper row.
 *
 * If a document with the same dedup key already exists we merge the new source
 * into its `sources` array instead of creating a duplicate.
 */
export const upsertPaper = mutation({
  args: {
    title: v.string(),
    normalizedTitle: v.string(),
    journal: v.optional(v.string()),
    publisher: v.optional(v.string()),
    articleType: v.optional(v.string()),
    publicationDate: v.optional(v.number()),
    doi: v.optional(v.string()),
    pmid: v.optional(v.string()),
    pmcid: v.optional(v.string()),
    externalId: v.optional(v.string()),
    isOpenAccess: v.optional(v.boolean()),
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
    license: v.optional(v.string()),
    authors: v.optional(v.string()),
    journalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = paperDedupKey({
      doi: args.doi,
      pmid: args.pmid,
      pmcid: args.pmcid,
      title: args.title,
      journal: args.journal,
      publicationDate: args.publicationDate,
    });

    const existing = await ctx.db.get(id);
    const now = Date.now();

    const sourceEntry: {
      type: string;
      id?: string | undefined;
      url?: string | undefined;
    } = {
      type: args.source,
      id: args.sourceId ?? undefined,
      url: args.sourceUrl ?? undefined,
    };

    if (existing) {
      const sources = [...(existing.sources ?? [])];
      const replaced = sources.some(
        (s) => s.type === args.source && s.id === args.sourceId,
      );
      if (!replaced) {
        sources.push(sourceEntry);
        await ctx.db.patch(id, {
          sources,
          updatedAt: now,
          isOpenAccess:
            args.isOpenAccess ?? existing.isOpenAccess ?? false,
        });
      }
      return { ok: true, inserted: false, existing: true };
    }

    // First source seen for this normalized paper.
    const docId: v.Id<"researchPapers"> = id;
    await ctx.db.insert("researchPapers", {
      _id: docId,
      title: args.title.trim().slice(0, 600),
      normalizedTitle: args.normalizedTitle.trim().slice(0, 600),
      journal: args.journal?.trim().slice(0, 200),
      publisher: args.publisher?.trim().slice(0, 200),
      articleType: args.articleType?.trim().slice(0, 120),
      publicationDate: args.publicationDate,
      doi: args.doi?.trim(),
      pmid: args.pmid?.trim(),
      pmcid: args.pmcid?.trim(),
      externalId: args.externalId?.trim(),
      authors: args.authors?.trim().slice(0, 500),
      journalId: args.journalId?.trim(),
      isOpenAccess: args.isOpenAccess ?? args.source === "pmc",
      abstract: args.abstract?.trim().slice(0, 12000),
      genovaSummary: args.genovaSummary?.trim().slice(0, 3000),
      keyFindings: (args.keyFindings ?? [])
        .map((k) => k.trim().slice(0, 400)),
      topics: (args.topics ?? [])
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 40),
      keywords: (args.keywords ?? [])
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 40),
      source: args.source,
      sourceUrl: args.sourceUrl?.trim().slice(0, 2000),
      sources: [sourceEntry],
      citationCount: args.citationCount,
      imageUrl: args.imageUrl?.trim(),
      imageLicense: args.imageLicense?.trim(),
      license: args.license?.trim(),
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, inserted: true, existing: false };
  },
});

/** Persist one adapter fetch cycle. */
export const logSync = mutation({
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

// ── QUERIES ────────────────────────────────────────────────────────────────

/** Paginated list with optional filters + cursor. */
export const listPapers = query({
  args: {
    cursor: v.optional(v.id("researchPapers")),
    limit: v.optional(v.number()),
    source: v.optional(v.string()),
    openAccessOnly: v.optional(v.boolean()),
    articleType: v.optional(v.string()),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
    topics: v.optional(v.array(v.string())),
    sort: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 24, 80);
    const rows: any[] = [];

    const cursor = args.cursor;
    const entries = await ctx.db
      .query("researchPapers")
      .withIndex("by_created", (q) => q)
      .order("desc")
      .collect();

    for (const row of entries) {
      if (cursor && row._id === cursor) continue;
      if (args.source && row.source !== args.source) continue;
      if (args.openAccessOnly && !row.isOpenAccess) continue;
      if (args.articleType && row.articleType !== args.articleType) continue;
      if (args.yearFrom != null || args.yearTo != null) {
        const y = row.publicationDate
          ? new Date(row.publicationDate).getFullYear()
          : null;
        if (y == null) continue;
        if (args.yearFrom != null && y < args.yearFrom) continue;
        if (args.yearTo != null && y > args.yearTo) continue;
      }
      if (args.topics && args.topics.length) {
        if (!args.topics.some((t) => (row.topics ?? []).includes(t)))
          continue;
      }
      if (args.sort === "oldest") {
        rows.unshift(row);
        if (rows.length >= limit) break;
      } else {
        rows.push(row);
        if (rows.length >= limit) break;
      }
    }

    const nextCursor = rows.length >= limit ? rows[rows.length - 1]._id : null;
    return { items: rows, nextCursor };
  },
});

/** Relevance search over title/authors/journal/keywords/topics/identifiers. */
export const searchPapers = query({
  args: {
    q: v.string(),
    cursor: v.optional(v.id("researchPapers")),
    limit: v.optional(v.number()),
    source: v.optional(v.string()),
    openAccessOnly: v.optional(v.boolean()),
    articleType: v.optional(v.string()),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
    topics: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const term = args.q.trim().toLowerCase();
    if (!term) {
      return { items: [], nextCursor: null, total: 0 };
    }
    const tokens = term.split(/\s+/).filter(Boolean);
    const limit = Math.min(args.limit ?? 24, 80);

    const all = await ctx.db
      .query("researchPapers")
      .withIndex("by_created", (q) => q)
      .order("desc")
      .collect();

    const scored: { row: any; score: number }[] = [];

    for (const row of all) {
      if (args.source && row.source !== args.source) continue;
      if (args.openAccessOnly && !row.isOpenAccess) continue;
      if (args.articleType && row.articleType !== args.articleType) continue;
      if (args.yearFrom != null || args.yearTo != null) {
        const y = row.publicationDate
          ? new Date(row.publicationDate).getFullYear()
          : null;
        if (y == null) continue;
        if (args.yearFrom != null && y < args.yearFrom) continue;
        if (args.yearTo != null && y > args.yearTo) continue;
      }
      if (args.topics && args.topics.length) {
        if (!args.topics.some((t) => (row.topics ?? []).includes(t)))
          continue;
      }
      if (args.cursor && row._id === args.cursor) continue;

      const hay = [
        row.normalizedTitle ?? "",
        row.authors ?? "",
        row.journal ?? "",
        row.publisher ?? "",
        (row.keywords ?? []).join(" "),
        (row.topics ?? []).join(" "),
        row.doi ?? "",
        row.pmid ?? "",
        row.pmcid ?? "",
        row.articleType ?? "",
        row.abstract ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      let score = 0;
      for (const token of tokens) {
        if (hay.includes(token)) score += 1;
        if ((row.normalizedTitle ?? "").includes(token)) score += 3;
        if (
          (row.doi ?? "").includes(token) ||
          (row.pmid ?? "").includes(token) ||
          (row.pmcid ?? "").includes(token)
        )
          score += 5;
      }
      if (score > 0) scored.push({ row, score });
    }

    scored.sort((a, b) =>
      b.score - a.score ||
        (b.row.publicationDate ?? 0) - (a.row.publicationDate ?? 0),
    );

    const selected = scored.slice(0, limit);
    const nextCursor =
      selected.length >= limit
        ? selected[selected.length - 1].row._id
        : null;
    return {
      items: selected.map((s) => s.row),
      nextCursor,
      total: scored.length,
    };
  },
});

/** One paper by document id. */
export const getPaper = query({
  args: { id: v.id("researchPapers") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

/** Latest N papers (unfiltered) — used by dashboard strip. */
export const latestPapers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 12, 40);
    const rows: any[] = [];
    for await (const row of ctx.db
      .query("researchPapers")
      .withIndex("by_created", (q) => q)
      .order("desc")) {
      rows.push(row);
      if (rows.length >= limit) break;
    }
    return rows;
  },
});

/** Popular topics = topic -> count across the stored corpus. */
export const popularTopics = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 14, 40);
    const counts: Record<string, number> = {};
    for await (const row of ctx.db
      .query("researchPapers")
      .withIndex("by_created", (q) => q)
      .order("asc")) {
      for (const t of row.topics ?? []) {
        counts[t] = (counts[t] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
});

/** Saved papers for the current user. */
export const mySavedPapers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("savedPapers")
      .withIndex("by_user", (q) => q)
      .collect();
  },
});

/** Toggle save (insert or delete) for the signed-in user. */
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

    return await ctx.db.insert("savedPapers", {
      userId: user._id,
      paperId: args.paperId,
      source: args.source,
      createdAt: Date.now(),
    });
  },
});

/** Last-known status per source. */
export const syncStatus = query({
  args: {},
  handler: async (ctx) => {
    const out: Record<
      string,
      { lastStatus: string; lastMessage: string; lastCount: number | null; lastRun: number | null }
    > = {};
    const rows = await ctx.db.query("researchSyncLogs").collect();
    for (const r of rows.sort((a, b) => b.createdAt - a.createdAt)) {
      if (!out[r.source] || r.createdAt > (out[r.source].lastRun ?? 0)) {
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

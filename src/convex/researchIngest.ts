"use node";

/**
 * Research Library ingestion pipeline (runs server-side only).
 *
 *   External APIs → fetch → normalize → validate → dedup → classify topics
 *                 → Genova summary → store in Convex → Research Library
 *
 * Each source is an isolated adapter (researchAdapters.ts). One failing
 * source never breaks the others: every source logs its own row in
 * `researchSyncLogs` and the run continues (spec §16).
 *
 * Elsevier reads ELSEVIER_API_KEY from the environment — it never reaches
 * the browser, and the sync degrades gracefully when it is missing.
 */

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { ActionCtx } from "./_generated/server";
import {
  AdapterError,
  fetchElsevierArticles,
  fetchPMCArticles,
  fetchPubMedArticles,
  type NormalizedPaper,
  type SourceId,
} from "./researchAdapters";

export type SourceResult = {
  source: SourceId;
  status: "processed" | "failed";
  fetched: number;
  inserted: number;
  merged: number;
  failed: number;
  message?: string;
  errorCode?: string;
};

async function runSource(
  ctx: ActionCtx,
  source: SourceId,
  query: string,
  limit: number,
): Promise<SourceResult> {
  const base: SourceResult = {
    source,
    status: "processed",
    fetched: 0,
    inserted: 0,
    merged: 0,
    failed: 0,
  };
  try {
    let papers: NormalizedPaper[];
    if (source === "pubmed") {
      papers = await fetchPubMedArticles(query, limit);
    } else if (source === "pmc") {
      papers = await fetchPMCArticles(query, limit);
    } else {
      papers = await fetchElsevierArticles(
        query,
        limit,
        process.env.ELSEVIER_API_KEY ?? "",
      );
    }
    base.fetched = papers.length;

    // Validate before touching the DB: drop records without a usable title.
    const valid = papers.filter((p) => p.title && p.title.trim().length > 3);
    base.failed += papers.length - valid.length;

    if (valid.length > 0) {
      const result = await ctx.runMutation(internal.research.ingestBatch, {
        articles: valid,
      });
      base.inserted = result.inserted;
      base.merged = result.merged;
      base.failed += result.failed;
    }

    await ctx.runMutation(internal.research.logSync, {
      source,
      status: "processed",
      message: `query="${query}" fetched=${base.fetched} inserted=${base.inserted} merged=${base.merged}`,
      count: base.inserted + base.merged,
    });
    return base;
  } catch (err) {
    const adapterErr = err as AdapterError;
    base.status = "failed";
    base.errorCode = adapterErr?.code ?? "unknown";
    base.message = adapterErr?.message ?? String(err).slice(0, 300);
    await ctx.runMutation(internal.research.logSync, {
      source,
      status: "failed",
      message: base.message,
      errorCode: base.errorCode,
      count: 0,
    });
    return base;
  }
}

/**
 * Sync all three sources for one query. Sources are independent: a failure
 * in Elsevier still leaves PubMed + PMC results in the library (spec §16).
 */
export const syncResearch = action({
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ results: SourceResult[] }> => {
    const query = (args.query ?? "antibiotic resistance").trim().slice(0, 200);
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 25);
    const wanted = new Set(
      (args.sources ?? ["pubmed", "pmc", "elsevier"]).filter(
        (s): s is SourceId => s === "pubmed" || s === "pmc" || s === "elsevier",
      ),
    );

    const results: SourceResult[] = [];
    // Sequential on purpose: NCBI allows ≤3 unauthenticated requests/second.
    if (wanted.has("pubmed")) results.push(await runSource(ctx, "pubmed", query, limit));
    if (wanted.has("pmc")) results.push(await runSource(ctx, "pmc", query, limit));
    if (wanted.has("elsevier")) results.push(await runSource(ctx, "elsevier", query, limit));

    return { results };
  },
});

/**
 * Sync several topics in one call. Internal: invoked by the daily cron
 * (see crons.ts), so anonymous clients cannot trigger outbound API traffic.
 */
export const syncResearchBatch = internalAction({
  args: {
    queries: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const queries = (
      args.queries ?? [
        "antibiotic resistance",
        "CRISPR gene editing",
        "cancer immunotherapy",
        "microbiome metagenomics",
      ]
    )
      .map((q) => q.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 8);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 20);

    const all: (SourceResult & { query: string })[] = [];
    for (const query of queries) {
      const { results } = await syncOneQuery(ctx, query, limit);
      for (const r of results) all.push({ ...r, query });
    }

    const totals = all.reduce(
      (acc, r) => ({
        inserted: acc.inserted + r.inserted,
        merged: acc.merged + r.merged,
        failed: acc.failed + r.failed,
      }),
      { inserted: 0, merged: 0, failed: 0 },
    );
    return { results: all, totals };
  },
});

async function syncOneQuery(ctx: ActionCtx, query: string, limit: number) {
  const results: SourceResult[] = [];
  results.push(await runSource(ctx, "pubmed", query, limit));
  results.push(await runSource(ctx, "pmc", query, limit));
  results.push(await runSource(ctx, "elsevier", query, limit));
  return { results };
}

"use node";

/**
 * Genova BioNetwork Explorer — public actions (server-side only).
 * ─────────────────────────────────────────────────────────────────────────────
 *   searchEntities  → resolve a name / symbol / question into real candidates
 *   buildNetwork    → assemble a unified graph from the enabled sources
 *   expandNode      → next shell around one node (STRING partners, pathways…)
 *   enrichPathways  → Reactome over-representation analysis (p-value + FDR)
 *
 * Every external response is cached in `bioNetworkCache` (JSON-safe copy) so
 * repeat visits are instant and external APIs are not re-hit needlessly.
 * A failing source never throws the whole action: it is reported as a
 * SourceStatus with its real reason (spec §8 — no fabricated data).
 */
import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  assembleNetwork,
  expandNode as expandNodeInAdapters,
  reactomeEnrichment,
  searchEntities as searchEntitiesInAdapters,
  SPECIES,
  type EntityKind,
  type GraphSourceId,
  type NetworkGraph,
} from "./bioNetworkAdapters";

const ALL_SOURCES: GraphSourceId[] = [
  "string",
  "reactome",
  "kegg",
  "uniprot",
  "ncbi",
  "opentargets",
  "genecards",
];

function parseSources(raw: string[] | undefined, fallback: GraphSourceId[]): GraphSourceId[] {
  const list = raw && raw.length ? raw : fallback;
  const out: GraphSourceId[] = [];
  for (const s of list) {
    if ((ALL_SOURCES as string[]).includes(s) && !out.includes(s as GraphSourceId)) {
      out.push(s as GraphSourceId);
    }
  }
  return out.length ? out : fallback;
}

function speciesOf(n: number | undefined): number {
  return n && SPECIES[n] ? n : 9606;
}

function cacheKey(kind: string, params: unknown): string {
  // Version bump invalidates entries written by older adapter code.
  return `${kind}:v5:${JSON.stringify(params)}`;
}

/** JSON round-trip guarantees a Convex-serializable payload (drops undefined). */
function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function withCache<T>(
  ctx: ActionCtx,
  kind: string,
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
): Promise<{ value: T; fromCache: boolean }> {
  const hit = (await ctx.runQuery(internal.bioNetwork.getCache, { key })) as {
    payload: T;
    fetchedAt: number;
  } | null;
  if (hit) return { value: hit.payload, fromCache: true };
  const value = await compute();
  await ctx.runMutation(internal.bioNetwork.putCache, {
    key,
    kind,
    payload: sanitize(value),
    ttlMs,
  });
  await ctx.runMutation(internal.bioNetwork.purgeExpired, {}).catch(() => undefined);
  return { value, fromCache: false };
}

// ── TTLs ────────────────────────────────────────────────────────────────────
const TTL_SEARCH = 6 * 60 * 60 * 1000; // 6h — search suggestions
const TTL_NETWORK = 12 * 60 * 60 * 1000; // 12h — built graphs
const TTL_ENRICH = 24 * 60 * 60 * 1000; // 24h — Reactome statistics

// ═══════════════════════════════════════════════════════════════════════════
//  1. Entity search (spec §1)
// ═══════════════════════════════════════════════════════════════════════════

export const searchEntities = action({
  args: {
    query: v.string(),
    species: v.optional(v.number()),
    sources: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = args.query.trim().slice(0, 200);
    if (!query) return { candidates: [], statuses: [], fromCache: false };
    const species = speciesOf(args.species);
    const sources = parseSources(args.sources, ["string", "ncbi", "uniprot", "kegg", "reactome"]);
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 30);
    const key = cacheKey("search", { query: query.toLowerCase(), species, sources, limit });

    const { value, fromCache } = await withCache(
      ctx,
      "search",
      key,
      TTL_SEARCH,
      async () => await searchEntitiesInAdapters({ query, species, sources, limit }),
    );
    return { ...value, fromCache };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
//  2. Network assembly (spec §2–§5)
// ═══════════════════════════════════════════════════════════════════════════

export const buildNetwork = action({
  args: {
    identifiers: v.array(v.string()),
    query: v.optional(v.string()),
    species: v.optional(v.number()),
    sources: v.optional(v.array(v.string())),
    requiredScore: v.optional(v.number()),
    levels: v.optional(v.number()),
    maxNodes: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NetworkGraph> => {
    const identifiers = args.identifiers
      .map((s) => s.trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 12);
    const species = speciesOf(args.species);
    const sources = parseSources(args.sources, ["string", "reactome", "kegg", "uniprot", "ncbi"]);
    const requiredScore = Math.min(Math.max(args.requiredScore ?? 0.4, 0), 1);
    const levels = Math.min(Math.max(args.levels ?? 1, 0), 2);
    const maxNodes = Math.min(Math.max(args.maxNodes ?? 80, 10), 150);
    const query = (args.query ?? identifiers.join(", ")).slice(0, 300);
    const key = cacheKey("network", {
      identifiers: identifiers.map((s) => s.toLowerCase()).sort(),
      species,
      sources: [...sources].sort(),
      requiredScore,
      levels,
      maxNodes,
    });

    const { value, fromCache } = await withCache(ctx, "network", key, TTL_NETWORK, async () => {
      const graph = await assembleNetwork({
        identifiers,
        query,
        species,
        sources,
        requiredScore,
        levels,
        maxNodes,
      });
      if (graph.nodes.length === 0) {
        // Don't cache empty graphs — the user may retry with other sources.
        throw new EmptyNetworkError(graph);
      }
      return graph;
    }).catch(async (err) => {
      if (err instanceof EmptyNetworkError) return { value: err.graph, fromCache: false };
      throw err;
    });

    return { ...value, meta: { ...value.meta, fromCache } };
  },
});

class EmptyNetworkError extends Error {
  readonly graph: NetworkGraph;
  constructor(graph: NetworkGraph) {
    super("empty network");
    this.graph = graph;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. Node expansion (spec §2 — grow the network from any node)
// ═══════════════════════════════════════════════════════════════════════════

export const expandNode = action({
  args: {
    node: v.object({
      id: v.string(),
      label: v.string(),
      kind: v.union(
        v.literal("gene"),
        v.literal("protein"),
        v.literal("disease"),
        v.literal("pathway"),
        v.literal("drug"),
      ),
      ids: v.optional(v.record(v.string(), v.string())),
    }),
    species: v.optional(v.number()),
    sources: v.optional(v.array(v.string())),
    requiredScore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    nodes: NetworkGraph["nodes"];
    edges: NetworkGraph["edges"];
    statuses: NetworkGraph["statuses"];
    fromCache: boolean;
  }> => {
    const species = speciesOf(args.species);
    const sources = parseSources(args.sources, ["string", "kegg", "reactome", "opentargets"]);
    const requiredScore = Math.min(Math.max(args.requiredScore ?? 0.4, 0), 1);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 30);
    const key = cacheKey("expand", {
      id: args.node.id,
      species,
      sources: [...sources].sort(),
      requiredScore,
      limit,
    });

    const { value, fromCache } = await withCache(ctx, "expand", key, TTL_NETWORK, async () => {
      const node: Parameters<typeof expandNodeInAdapters>[0]["node"] = {
        id: args.node.id,
        label: args.node.label,
        kind: args.node.kind as EntityKind,
        ids: args.node.ids,
      };
      return await expandNodeInAdapters({
        node,
        species,
        sources,
        requiredScore,
        limit,
      });
    });
    return { ...value, fromCache };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
//  4. Pathway enrichment (spec §4 — Reactome over-representation, real FDR)
// ═══════════════════════════════════════════════════════════════════════════

export const enrichPathways = action({
  args: {
    identifiers: v.array(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    pathways: Awaited<ReturnType<typeof reactomeEnrichment>>["pathways"];
    pathwaysFound: number;
    notFound: number;
    fromCache: boolean;
    message?: string;
  }> => {
    const identifiers = [...new Set(args.identifiers.map((s) => s.trim()).filter(Boolean))].slice(0, 200);
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 100);
    if (identifiers.length < 2) {
      return {
        pathways: [],
        pathwaysFound: 0,
        notFound: 0,
        fromCache: false,
        message: "برای تحلیل غنای مسیرها دست‌کم دو موجودیت با شناسهٔ استاندارد لازم است.",
      };
    }
    const key = cacheKey("enrichment", { identifiers: identifiers.map((s) => s.toLowerCase()).sort(), limit });

    try {
      const { value, fromCache } = await withCache(ctx, "enrichment", key, TTL_ENRICH, async () => {
        const res = await reactomeEnrichment(identifiers, limit);
        if (!res.pathways.length) throw new EnrichError(res);
        return res;
      }).catch(async (err) => {
        if (err instanceof EnrichError) return { value: err.res, fromCache: false };
        throw err;
      });
      return { ...value, fromCache };
    } catch (e) {
      return {
        pathways: [],
        pathwaysFound: 0,
        notFound: 0,
        fromCache: false,
        message: (e as Error).message,
      };
    }
  },
});

class EnrichError extends Error {
  readonly res: Awaited<ReturnType<typeof reactomeEnrichment>>;
  constructor(res: Awaited<ReturnType<typeof reactomeEnrichment>>) {
    super("no enriched pathways");
    this.res = res;
  }
}

/**
 * BioNetwork Explorer — cache reads/writes (default runtime).
 *
 * The "use node" action file (bioNetworkActions.ts) calls these via
 * internal.* so live external-API responses can be stored and replayed
 * without re-hitting STRING / Reactome / KEGG / UniProt / NCBI.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Read a fresh (non-expired) cache entry. Returns null on miss/expiry. */
export const getCache = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("bioNetworkCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!row) return null;
    if (row.expiresAt < Date.now()) return null;
    return { payload: row.payload, fetchedAt: row.fetchedAt };
  },
});

/** Insert or refresh a cache entry with the given TTL. */
export const putCache = internalMutation({
  args: {
    key: v.string(),
    kind: v.string(),
    payload: v.any(),
    ttlMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("bioNetworkCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        kind: args.kind,
        payload: args.payload,
        fetchedAt: now,
        expiresAt: now + args.ttlMs,
      });
    } else {
      await ctx.db.insert("bioNetworkCache", {
        key: args.key,
        kind: args.kind,
        payload: args.payload,
        fetchedAt: now,
        expiresAt: now + args.ttlMs,
      });
    }
    return existing?._id ?? "inserted";
  },
});

/** Opportunistic cleanup of expired rows (called after writes). */
export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("bioNetworkCache")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .take(50);
    for (const doc of expired) await ctx.db.delete(doc._id);
    return expired.length;
  },
});

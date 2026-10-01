// ─────────────────────────────────────────────────────────────────────────────
// Site Studio — public read only.
//
// The Site Studio builder itself (pages, elements, drafts, media, versioning,
// staff permissions, themes and the preview/publish pipeline) has been
// removed from the site along with its admin entry point and routes.
//
// What remains is the single public read that the live pages depend on:
// `usePageConfig()` overlays the published section config on top of the
// hardcoded defaults of the homepage and the rules page. Removing this query
// would break those pages, so the published config is kept as-is — it is now
// read-only, with no editor able to change it.
// ─────────────────────────────────────────────────────────────────────────────
import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Returns the published config for a page key, or null when the page has no
 * overrides. Consumers fall back to their own defaults in that case.
 */
export const getPageConfig = query({
  args: { pageKey: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("pageConfigs")
      .withIndex("by_key", (q) => q.eq("pageKey", args.pageKey))
      .first();
    if (!row) return null;
    return {
      pageKey: row.pageKey,
      sections: row.published ?? null,
      updatedAt: row.updatedAt,
    };
  },
});

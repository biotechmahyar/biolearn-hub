// ─────────────────────────────────────────────────────────────────────────────
// Site demos — public read only.
//
// The "دمو سایت" admin section (CRUD, cloning and seeding) has been removed
// from the admin panel. What remains is the single public lookup that the demo
// preview route (`/demo/:demoSlug`) and the 404 fallback still depend on.
// ─────────────────────────────────────────────────────────────────────────────
import { query } from "./_generated/server";
import { v } from "convex/values";

/** Get a single demo by slug. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const demo = await ctx.db
      .query("siteDemos")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!demo) return null;
    const creator = await ctx.db.get(demo.createdBy);
    return { ...demo, creatorName: creator?.name ?? creator?.email ?? "ناشناخته" };
  },
});

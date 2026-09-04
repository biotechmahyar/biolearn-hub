import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// ── Helpers ──────────────────────────────────────────────────────────────────

const isStaff = async (ctx: any) => {
  const user = await getCurrentUser(ctx);
  return (
    !!user &&
    (user.role === "content_manager" ||
      user.role === "admin" ||
      user.role === "site_admin")
  );
};

// ── Admin CRUD ───────────────────────────────────────────────────────────────

export const adminListPaths = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isStaff(ctx))) return [];
    const paths = await ctx.db.query("academyPaths").order("desc").collect();
    const result = [];
    for (const p of paths) {
      const items = await ctx.db
        .query("academyPathItems")
        .withIndex("by_path", (q) => q.eq("pathId", p._id))
        .collect();
      const enriched = [];
      for (const item of items.sort((a, b) => a.order - b.order)) {
        const w = item.workshopId ? await ctx.db.get(item.workshopId) : null;
        enriched.push({
          ...item,
          workshopTitle: w?.title ?? "—",
          workshopDate: w?.date ?? null,
          workshopTime: w?.time ?? null,
        });
      }
      result.push({ ...p, items: enriched });
    }
    return result;
  },
});

export const adminCreatePath = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    level: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const slug = `path-${Date.now().toString(36)}`;
    return await ctx.db.insert("academyPaths", {
      title: args.title,
      slug,
      description: args.description,
      level: args.level,
      color: args.color ?? "emerald",
      published: false,
      createdAt: Date.now(),
    });
  },
});

export const adminUpdatePath = mutation({
  args: {
    id: v.id("academyPaths"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    level: v.optional(v.string()),
    color: v.optional(v.string()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const { id, ...patch } = args;
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) clean[k] = val;
    }
    if (Object.keys(clean).length > 0) await ctx.db.patch(id, clean);
  },
});

export const adminDeletePath = mutation({
  args: { id: v.id("academyPaths") },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const items = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", args.id))
      .collect();
    for (const item of items) await ctx.db.delete(item._id);
    await ctx.db.delete(args.id);
  },
});

export const adminAddPathItem = mutation({
  args: {
    pathId: v.id("academyPaths"),
    workshopId: v.id("workshops"),
  },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const existing = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", args.pathId))
      .collect();
    if (existing.some((i) => i.workshopId === args.workshopId)) {
      throw new Error("این کارگاه قبلاً در مسیر اضافه شده است.");
    }
    return await ctx.db.insert("academyPathItems", {
      pathId: args.pathId,
      workshopId: args.workshopId,
      order: existing.length,
    });
  },
});

export const adminRemovePathItem = mutation({
  args: { id: v.id("academyPathItems") },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.delete(args.id);
  },
});

export const adminMovePathItem = mutation({
  args: { id: v.id("academyPathItems"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) throw new Error("دسترسی لازم است.");
    const item = await ctx.db.get(args.id);
    if (!item) return;
    const siblings = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", item.pathId))
      .collect();
    siblings.sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s._id === args.id);
    const swapWith = args.direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
    if (!swapWith) return;
    await ctx.db.patch(item._id, { order: swapWith.order });
    await ctx.db.patch(swapWith._id, { order: item.order });
  },
});

// List workshops available to add (published ones not already in the path)
export const adminListAvailableWorkshops = query({
  args: { pathId: v.id("academyPaths") },
  handler: async (ctx, args) => {
    if (!(await isStaff(ctx))) return [];
    const workshops = await ctx.db.query("workshops").collect();
    const items = await ctx.db
      .query("academyPathItems")
      .withIndex("by_path", (q) => q.eq("pathId", args.pathId))
      .collect();
    const usedIds = new Set(items.map((i) => i.workshopId));
    return workshops.filter((w) => !usedIds.has(w._id));
  },
});

// ── Public / Student views ───────────────────────────────────────────────────

export const listPublishedPaths = query({
  args: {},
  handler: async (ctx) => {
    const paths = await ctx.db
      .query("academyPaths")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const result = [];
    for (const p of paths) {
      const items = await ctx.db
        .query("academyPathItems")
        .withIndex("by_path", (q) => q.eq("pathId", p._id))
        .collect();
      const enriched = [];
      for (const item of items.sort((a, b) => a.order - b.order)) {
        const w = item.workshopId ? await ctx.db.get(item.workshopId) : null;
        if (!w) continue;
        enriched.push({
          itemId: item._id,
          order: item.order,
          workshopId: w._id,
          title: w.title,
          topic: w.topic,
          date: w.date,
          time: w.time,
          price: w.price,
          free: w.free,
          slug: w.slug,
        });
      }
      result.push({
        _id: p._id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        level: p.level,
        color: p.color ?? "emerald",
        items: enriched,
      });
    }
    return result;
  },
});

// My enrollments across all paths (which steps are done)
export const listMyPathProgress = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject as any;
    const enrolls = await ctx.db
      .query("workshopEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return enrolls.map((e) => e.workshopId);
  },
});

// ── Instructor view ──────────────────────────────────────────────────────────

export const listInstructorPaths = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const paths = await ctx.db
      .query("academyPaths")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const result = [];
    for (const p of paths) {
      const items = await ctx.db
        .query("academyPathItems")
        .withIndex("by_path", (q) => q.eq("pathId", p._id))
        .collect();
      const myItems = [];
      for (const item of items.sort((a, b) => a.order - b.order)) {
        const w = item.workshopId ? await ctx.db.get(item.workshopId) : null;
        if (!w) continue;
        // Match by instructor's name on the workshop's instructor, or any item
        myItems.push({
          workshopId: w._id,
          title: w.title,
          date: w.date,
          time: w.time,
          order: item.order,
        });
      }
      if (myItems.length > 0) {
        result.push({
          _id: p._id,
          title: p.title,
          description: p.description,
          level: p.level,
          items: myItems,
        });
      }
    }
    return result;
  },
});

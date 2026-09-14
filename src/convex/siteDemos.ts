import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ───────────────────────────────────────────────────────────────

/** List all demos, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const demos = await ctx.db.query("siteDemos").order("desc").collect();
    // Attach creator name
    const demosWithCreator = await Promise.all(
      demos.map(async (d) => {
        const creator = await ctx.db.get(d.createdBy);
        return { ...d, creatorName: creator?.name ?? creator?.email ?? "ناشناخته" };
      })
    );
    return demosWithCreator;
  },
});

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

// ── Mutations ─────────────────────────────────────────────────────────────

/** Create a new demo. */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    theme: v.optional(v.any()),
    previewImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) throw new Error("Authentication required");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", me.email ?? ""))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
      throw new Error("Only admins can create demos");
    }
    // Ensure slug is unique
    const existing = await ctx.db
      .query("siteDemos")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Slug already exists");

    const now = Date.now();
    const id = await ctx.db.insert("siteDemos", {
      name: args.name,
      slug: args.slug,
      description: args.description ?? "",
      status: "active",
      theme: args.theme ?? null,
      previewImage: args.previewImage,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/** Update an existing demo. */
export const update = mutation({
  args: {
    id: v.id("siteDemos"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    theme: v.optional(v.any()),
    previewImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) throw new Error("Authentication required");
    const demo = await ctx.db.get(args.id);
    if (!demo) throw new Error("Demo not found");

    // If slug is changing, ensure uniqueness
    if (args.slug && args.slug !== demo.slug) {
      const existing = await ctx.db
        .query("siteDemos")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .unique();
      if (existing) throw new Error("Slug already exists");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.slug !== undefined) patch.slug = args.slug;
    if (args.description !== undefined) patch.description = args.description;
    if (args.status !== undefined) patch.status = args.status;
    if (args.theme !== undefined) patch.theme = args.theme;
    if (args.previewImage !== undefined) patch.previewImage = args.previewImage;

    await ctx.db.patch(args.id, patch as any);
    return args.id;
  },
});

/** Clone a demo with a new slug and name. */
export const clone = mutation({
  args: {
    sourceId: v.id("siteDemos"),
    newName: v.string(),
    newSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) throw new Error("Authentication required");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", me.email ?? ""))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
      throw new Error("Only admins can clone demos");
    }
    const source = await ctx.db.get(args.sourceId);
    if (!source) throw new Error("Source demo not found");

    const existing = await ctx.db
      .query("siteDemos")
      .withIndex("by_slug", (q) => q.eq("slug", args.newSlug))
      .unique();
    if (existing) throw new Error("Slug already exists");

    const now = Date.now();
    const id = await ctx.db.insert("siteDemos", {
      name: args.newName,
      slug: args.newSlug,
      description: source.description ?? "",
      status: "active",
      theme: source.theme ?? null,
      previewImage: source.previewImage,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/** Delete a demo. */
export const remove = mutation({
  args: { id: v.id("siteDemos") },
  handler: async (ctx, args) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) throw new Error("Authentication required");
    const demo = await ctx.db.get(args.id);
    if (!demo) throw new Error("Demo not found");
    await ctx.db.delete(args.id);
    return true;
  },
});

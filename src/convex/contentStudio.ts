import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Auth helpers ─────────────────────────────────────────────────────────
async function isContentStaff(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  const user = await ctx.db.get(userId);
  if (!user) return false;
  return ["admin", "site_admin", "content_manager"].includes(user.role ?? "");
}

// ── Articles: list all for editor ────────────────────────────────────────
export const listArticles = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isContentStaff(ctx))) return [];
    return (await ctx.db.query("articles").order("desc").collect()).map((a) => ({
      _id: a._id,
      title: a.title,
      slug: a.slug,
      body: a.body,
      subtitle: (a as any).subtitle ?? "",
      category: a.category,
      authorName: a.authorName,
      status: a.status ?? (a.published ? "published" : "draft"),
      readTime: a.readTime,
      featured: a.featured,
      excerpt: (a as any).excerpt ?? "",
      tags: (a as any).tags ?? [],
      level: (a as any).level ?? "intermediate",
      featuredImage: (a as any).featuredImage ?? "",
      seoTitle: (a as any).seoTitle ?? "",
      seoDescription: (a as any).seoDescription ?? "",
      seoKeywords: (a as any).seoKeywords ?? [],
      ogTitle: (a as any).ogTitle ?? "",
      ogDescription: (a as any).ogDescription ?? "",
      createdAt: a.createdAt,
      updatedAt: (a as any).updatedAt ?? a.createdAt,
    }));
  },
});

// ── Get single article for editing ───────────────────────────────────────
export const getArticle = query({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) return null;
    return await ctx.db.get(args.id);
  },
});

// ── Create article ───────────────────────────────────────────────────────
export const createArticle = mutation({
  args: {
    title: v.string(),
    slug: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    category: v.string(),
    tags: v.optional(v.array(v.string())),
    excerpt: v.string(),
    body: v.string(),
    authorName: v.string(),
    featuredImage: v.optional(v.string()),
    level: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())),
    references: v.optional(
      v.array(
        v.object({
          title: v.string(),
          authors: v.string(),
          journal: v.string(),
          year: v.number(),
          doi: v.optional(v.string()),
          url: v.optional(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const now = Date.now();
    const slug =
      args.slug?.trim() ||
      args.title.trim().replace(/\s+/g, "-").replace(/[^\w\-]/g, "");
    const id = await ctx.db.insert("articles", {
      title: args.title.trim(),
      slug,
      subtitle: args.subtitle,
      category: args.category.trim() || "عمومی",
      tags: args.tags,
      excerpt: args.excerpt.trim(),
      body: args.body,
      authorName: args.authorName.trim() || "تیم Genova",
      featuredImage: args.featuredImage,
      accent: "teal",
      readTime: Math.max(1, Math.round(args.body.replace(/<[^>]*>/g, "").split(/\s+/).length / 200)),
      level: args.level,
      status: "draft",
      published: false,
      featured: false,
      seoTitle: args.seoTitle,
      seoDescription: args.seoDescription,
      seoKeywords: args.seoKeywords,
      references: args.references,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, id };
  },
});

// ── Update article ───────────────────────────────────────────────────────
export const updateArticle = mutation({
  args: {
    id: v.id("articles"),
    title: v.string(),
    slug: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    category: v.string(),
    tags: v.optional(v.array(v.string())),
    excerpt: v.string(),
    body: v.string(),
    authorName: v.string(),
    featuredImage: v.optional(v.string()),
    level: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("in_review"),
        v.literal("scheduled"),
        v.literal("published"),
        v.literal("archived"),
      ),
    ),
    published: v.boolean(),
    featured: v.boolean(),
    scheduledAt: v.optional(v.number()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())),
    ogTitle: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    ogImage: v.optional(v.string()),
    references: v.optional(
      v.array(
        v.object({
          title: v.string(),
          authors: v.string(),
          journal: v.string(),
          year: v.number(),
          doi: v.optional(v.string()),
          url: v.optional(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      slug: args.slug || args.title.trim().replace(/\s+/g, "-"),
      subtitle: args.subtitle,
      category: args.category.trim() || "عمومی",
      tags: args.tags,
      excerpt: args.excerpt.trim(),
      body: args.body,
      authorName: args.authorName.trim(),
      featuredImage: args.featuredImage,
      level: args.level,
      status: args.status ?? (args.published ? "published" : "draft"),
      published: args.published,
      featured: args.featured,
      scheduledAt: args.scheduledAt,
      seoTitle: args.seoTitle,
      seoDescription: args.seoDescription,
      seoKeywords: args.seoKeywords,
      ogTitle: args.ogTitle,
      ogDescription: args.ogDescription,
      ogImage: args.ogImage,
      references: args.references,
      readTime: Math.max(1, Math.round(args.body.replace(/<[^>]*>/g, "").split(/\s+/).length / 200)),
      updatedAt: now,
    } as any);
    return { ok: true };
  },
});

// ── Quick update (autosave) ──────────────────────────────────────────────
export const quickSave = mutation({
  args: {
    id: v.id("articles"),
    body: v.string(),
    title: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    subtitle: v.optional(v.string()),
    featuredImage: v.optional(v.string()),
    level: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())),
    references: v.optional(
      v.array(
        v.object({
          title: v.string(),
          authors: v.string(),
          journal: v.string(),
          year: v.number(),
          doi: v.optional(v.string()),
          url: v.optional(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const now = Date.now();
    const patch: Record<string, any> = {
      body: args.body,
      updatedAt: now,
    };
    if (args.title !== undefined) patch.title = args.title.trim();
    if (args.excerpt !== undefined) patch.excerpt = args.excerpt.trim();
    if (args.category !== undefined) patch.category = args.category;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.subtitle !== undefined) patch.subtitle = args.subtitle;
    if (args.featuredImage !== undefined) patch.featuredImage = args.featuredImage;
    if (args.level !== undefined) patch.level = args.level;
    if (args.seoTitle !== undefined) patch.seoTitle = args.seoTitle;
    if (args.seoDescription !== undefined) patch.seoDescription = args.seoDescription;
    if (args.seoKeywords !== undefined) patch.seoKeywords = args.seoKeywords;
    if (args.references !== undefined) patch.references = args.references;
    patch.readTime = Math.max(
      1,
      Math.round(args.body.replace(/<[^>]*>/g, "").split(/\s+/).length / 200),
    );
    await ctx.db.patch(args.id, patch);
    return { ok: true, savedAt: now };
  },
});

// ── Publish / Unpublish ──────────────────────────────────────────────────
export const togglePublish = mutation({
  args: {
    id: v.id("articles"),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.patch(args.id, {
      published: args.published,
      status: args.published ? "published" : "draft",
      updatedAt: Date.now(),
    } as any);
    return { ok: true };
  },
});

// ── Delete article ───────────────────────────────────────────────────────
export const deleteArticle = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const versions = await ctx.db
      .query("articleVersions")
      .withIndex("by_article", (q) => q.eq("articleId", args.id))
      .collect();
    for (const ver of versions) {
      await ctx.db.delete(ver._id);
    }
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── Version History ──────────────────────────────────────────────────────
export const saveVersion = mutation({
  args: {
    articleId: v.id("articles"),
    body: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ورود لازم است.");
    await ctx.db.insert("articleVersions", {
      articleId: args.articleId,
      body: args.body,
      title: args.title,
      savedBy: userId,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const listVersions = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) return [];
    return await ctx.db
      .query("articleVersions")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .order("desc")
      .collect();
  },
});

export const restoreVersion = mutation({
  args: { versionId: v.id("articleVersions") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error("نسخه یافت نشد.");
    await ctx.db.patch(version.articleId, {
      body: version.body,
      title: version.title,
      updatedAt: Date.now(),
    } as any);
    return { ok: true };
  },
});

// ── Media Library ────────────────────────────────────────────────────────
export const listMedia = query({
  args: {},
  handler: async (ctx) => {
    try {
      if (!(await isContentStaff(ctx))) return [];
      return await ctx.db.query("mediaItems").order("desc").collect();
    } catch {
      // Table may not exist yet in the deployment
      return [];
    }
  },
});

export const addMedia = mutation({
  args: {
    url: v.string(),
    name: v.string(),
    alt: v.optional(v.string()),
    caption: v.optional(v.string()),
    category: v.optional(v.string()),
    size: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ورود لازم است.");
    const id = await ctx.db.insert("mediaItems", {
      ...args,
      uploadedBy: userId,
      createdAt: Date.now(),
    });
    return { ok: true, id };
  },
});

export const updateMedia = mutation({
  args: {
    id: v.id("mediaItems"),
    alt: v.optional(v.string()),
    caption: v.optional(v.string()),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    const patch: Record<string, any> = {};
    if (args.alt !== undefined) patch.alt = args.alt;
    if (args.caption !== undefined) patch.caption = args.caption;
    if (args.name !== undefined) patch.name = args.name;
    if (args.category !== undefined) patch.category = args.category;
    await ctx.db.patch(args.id, patch);
    return { ok: true };
  },
});

export const deleteMedia = mutation({
  args: { id: v.id("mediaItems") },
  handler: async (ctx, args) => {
    if (!(await isContentStaff(ctx))) throw new Error("دسترسی لازم است.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

// ── AI Article Generation ────────────────────────────────────────────────
export const generateArticleWithAI = action({
  args: {
    prompt: v.string(),
    count: v.number(),
    category: v.string(),
  },
  handler: async (ctx, _args) => {
    // Placeholder: requires AI model configuration
    return {
      ok: false,
      error: "سیستم هوش مصنوعی در حال راه‌اندازی است.",
    };
  },
});

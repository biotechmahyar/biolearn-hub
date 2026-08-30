import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAnyAdmin } from "./admin";

export const addComment = mutation({
  args: {
    contentType: v.string(),
    contentId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("برای ثبت دیدگاه ابتدا وارد حساب شوید.");
    const text = args.text.trim();
    if (text.length < 2) throw new Error("دیدگاه خیلی کوتاه است.");
    if (text.length > 1000) throw new Error("دیدگاه حداکثر ۱۰۰۰ کاراکتر می‌تواند باشد.");

    return await ctx.db.insert("comments", {
      contentType: args.contentType,
      contentId: args.contentId,
      userId: user._id,
      userName: user.name ?? undefined,
      text,
      approved: false,
      createdAt: Date.now(),
    });
  },
});

export const listComments = query({
  args: { contentType: v.string(), contentId: v.string() },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_content", (q) =>
        q.eq("contentType", args.contentType).eq("contentId", args.contentId),
      )
      .filter((q) => q.eq(q.field("approved"), true))
      .order("asc")
      .collect();

    return Promise.all(
      comments.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        return {
          ...c,
          author: c.userName ?? user?.name ?? "کاربر Genova",
        };
      }),
    );
  },
});

// ── Admin: list pending comments ─────────────────────────────────────────────
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    return await ctx.db
      .query("comments")
      .withIndex("by_approved", (q) => q.eq("approved", false))
      .order("desc")
      .collect();
  },
});

// ── Admin: approve a comment ─────────────────────────────────────────────────
export const approveComment = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.patch(args.id, { approved: true, rejected: undefined });
    return { ok: true };
  },
});

// ── Admin: reject a comment ──────────────────────────────────────────────────
export const rejectComment = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.patch(args.id, { approved: false, rejected: true });
    return { ok: true };
  },
});

// ── Admin: delete a comment ──────────────────────────────────────────────────
export const deleteComment = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

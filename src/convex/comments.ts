import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

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
      text,
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
      .order("asc")
      .collect();

    return Promise.all(
      comments.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        return {
          ...c,
          author: user?.name ?? "کاربر Genova",
        };
      }),
    );
  },
});

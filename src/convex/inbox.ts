import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { isAnyAdmin } from "./admin";

export const sendInboxMessage = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("کاربر یافت نشد.");
    if (args.title.trim().length < 2) throw new Error("عنوان پیام لازم است.");
    await ctx.db.insert("inboxMessages", {
      userId: args.userId,
      title: args.title.trim(),
      body: args.body.trim(),
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const deleteInboxMessage = mutation({
  args: { id: v.id("inboxMessages") },
  handler: async (ctx, args) => {
    if (!(await isAnyAdmin(ctx))) throw new Error("دسترسی ادمین لازم است.");
    const msg = await ctx.db.get(args.id);
    if (!msg) throw new Error("پیام یافت نشد.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const listMyInbox = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const msgs = await ctx.db
      .query("inboxMessages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return msgs
      .map((m) => ({
        _id: m._id,
        title: m.title,
        body: m.body,
        readAt: m.readAt ?? null,
        createdAt: m.createdAt,
        unread: !m.readAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const markInboxRead = mutation({
  args: { id: v.id("inboxMessages") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("وارد نشده‌اید.");
    const msg = await ctx.db.get(args.id);
    if (!msg) throw new Error("پیام یافت نشد.");
    if (msg.userId !== user._id && !(await isAnyAdmin(ctx))) {
      throw new Error("این پیام متعلق به شما نیست.");
    }
    if (!msg.readAt) await ctx.db.patch(args.id, { readAt: Date.now() });
    return { ok: true };
  },
});

export const adminListInbox = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAnyAdmin(ctx))) return [];
    const msgs = await ctx.db.query("inboxMessages").order("desc").collect();
    return Promise.all(
      msgs.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          title: m.title,
          body: m.body,
          readAt: m.readAt ?? null,
          createdAt: m.createdAt,
          user: u ? { name: u.name, email: u.email, role: u.role } : null,
        };
      }),
    );
  },
});

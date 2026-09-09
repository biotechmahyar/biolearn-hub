import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("عدم دسترسی: لطفاً وارد شوید.");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("کاربر یافت نشد.");
  if (user.role !== "admin" && user.role !== "site_admin") {
    throw new Error("فقط مدیر سامانه و مدیر سایت به این بخش دسترسی دارند.");
  }
  return { userId, user };
}

function obfuscateToken(token: string): string {
  if (!token) return "";
  return btoa(token);
}

function deobfuscateToken(encoded: string): string {
  if (!encoded) return "";
  return atob(encoded);
}

function maskToken(token: string): string {
  if (!token || token.length < 10) return "••••••••";
  return token.slice(0, 6) + "••••••••" + token.slice(-4);
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Get raw token (admin-only, never sent to frontend) */
export const _getRawToken = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) return null;

    const bots = await ctx.db.query("baleBot").collect();
    const bot = bots[0];
    if (!bot) return null;
    return { token: deobfuscateToken(bot.tokenEncrypted) };
  },
});

/** Get Bale bot config (admin-only, masked token) */
export const getBotConfig = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    if (user.role !== "admin" && user.role !== "site_admin") return null;

    const bots = await ctx.db.query("baleBot").collect();
    const bot = bots[0];
    if (!bot) return null;

    return {
      _id: bot._id,
      botId: bot.botId ?? null,
      botName: bot.botName ?? null,
      botUsername: bot.botUsername ?? null,
      webhookUrl: bot.webhookUrl ?? null,
      connected: bot.connected,
      active: bot.active,
      startMessage: bot.startMessage,
      lastTestedAt: bot.lastTestedAt ?? null,
      lastTestResult: bot.lastTestResult ?? null,
      maskedToken: maskToken(deobfuscateToken(bot.tokenEncrypted)),
      hasToken: bot.tokenEncrypted.length > 0,
      updatedAt: bot.updatedAt,
    };
  },
});

/** Internal: find user by Bale ID — called from linking action */
export const _findUserByBaleId = query({
  args: { baleId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_baleId", (q) => q.eq("baleId", args.baleId))
      .first();
  },
});

/** Internal: find user by ID — used by linkByBaleInitData action */
export const _findUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

/** Save Bale bot token (admin-only) */
export const saveBotToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const token = args.token.trim();
    if (!token || token.length < 20) throw new Error("توکن نامعتبر است.");

    const now = Date.now();
    const bots = await ctx.db.query("baleBot").collect();
    const existing = bots[0];

    if (existing) {
      await ctx.db.patch(existing._id, {
        tokenEncrypted: obfuscateToken(token),
        connected: false,
        botId: undefined,
        botName: undefined,
        botUsername: undefined,
        webhookUrl: undefined,
        lastTestResult: undefined,
        updatedBy: userId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("baleBot", {
        tokenEncrypted: obfuscateToken(token),
        connected: false,
        active: true,
        startMessage: "سلام! 👋\nبه Genova خوش آمدید.\n\nبرای شروع یکی از دستورات زیر را ارسال کنید:",
        updatedBy: userId,
        updatedAt: now,
        createdAt: now,
      });
    }
    return { success: true };
  },
});

/** Update bot info after test connection */
export const _updateBotInfo = mutation({
  args: {
    botId: v.optional(v.string()),
    botName: v.optional(v.string()),
    botUsername: v.optional(v.string()),
    connected: v.optional(v.boolean()),
    webhookUrl: v.optional(v.string()),
    lastTestResult: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bots = await ctx.db.query("baleBot").collect();
    const bot = bots[0];
    if (!bot) return;

    await ctx.db.patch(bot._id, {
      ...args,
      lastTestedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/** Internal: directly link Bale account to a user (for Mini App auto-link) */
export const _linkDirect = mutation({
  args: {
    userId: v.id("users"),
    baleId: v.number(),
    baleUsername: v.optional(v.string()),
    baleFirstName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      baleId: args.baleId,
      baleUsername: args.baleUsername,
      baleFirstName: args.baleFirstName,
      baleLinkedAt: Date.now(),
    });
    return { success: true };
  },
});

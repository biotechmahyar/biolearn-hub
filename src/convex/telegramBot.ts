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
  return Buffer.from(token).toString("base64");
}

function deobfuscateToken(encoded: string): string {
  if (!encoded) return "";
  return Buffer.from(encoded, "base64").toString("utf-8");
}

function maskToken(token: string): string {
  if (!token || token.length < 10) return "••••••••";
  return token.slice(0, 6) + "••••••••" + token.slice(-4);
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const getBotConfig = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    if (user.role !== "admin" && user.role !== "site_admin") return null;

    const bots = await ctx.db.query("telegramBot").collect();
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

/** Get raw token (admin-only, never sent to frontend) */
export const _getRawToken = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "site_admin")) return null;

    const bots = await ctx.db.query("telegramBot").collect();
    const bot = bots[0];
    if (!bot) return null;
    return { token: deobfuscateToken(bot.tokenEncrypted) };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const saveBotToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const token = args.token.trim();
    if (!token || token.length < 20) throw new Error("توکن نامعتبر است.");

    const now = Date.now();
    const bots = await ctx.db.query("telegramBot").collect();
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
      await ctx.db.insert("telegramBot", {
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

export const deleteBotToken = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const bots = await ctx.db.query("telegramBot").collect();
    if (bots[0]) await ctx.db.delete(bots[0]._id);
    return { success: true };
  },
});

export const toggleBotActive = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAdmin(ctx);
    const bots = await ctx.db.query("telegramBot").collect();
    const bot = bots[0];
    if (!bot) throw new Error("بات تنظیم نشده است.");
    await ctx.db.patch(bot._id, {
      active: !bot.active,
      updatedBy: userId,
      updatedAt: Date.now(),
    });
    return { active: !bot.active };
  },
});

export const updateStartMessage = mutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const bots = await ctx.db.query("telegramBot").collect();
    const bot = bots[0];
    if (!bot) throw new Error("بات تنظیم نشده است.");
    await ctx.db.patch(bot._id, {
      startMessage: args.message,
      updatedBy: userId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/** Internal mutation to update bot info from actions */
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
    const bots = await ctx.db.query("telegramBot").collect();
    const bot = bots[0];
    if (!bot) return;

    const update: Record<string, any> = { updatedAt: Date.now(), lastTestedAt: Date.now() };
    if (args.botId !== undefined) update.botId = args.botId;
    if (args.botName !== undefined) update.botName = args.botName;
    if (args.botUsername !== undefined) update.botUsername = args.botUsername;
    if (args.connected !== undefined) update.connected = args.connected;
    if (args.webhookUrl !== undefined) update.webhookUrl = args.webhookUrl;
    if (args.lastTestResult !== undefined) update.lastTestResult = args.lastTestResult;

    await ctx.db.patch(bot._id, update);
  },
});

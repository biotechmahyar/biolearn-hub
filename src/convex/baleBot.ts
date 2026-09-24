import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
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

/**
 * Get the raw Bale bot token — INTERNAL ONLY.
 *
 * Deliberately not a public query: the token must never be reachable from a
 * client, and only server-side callers (auth layer, bot API layer) may read it.
 *
 * Source order:
 *   1. `BALE_BOT_TOKEN` from the deployment environment (the documented source)
 *   2. the admin-configured `baleBot` row, for backward compatibility
 */
export const _getRawToken = internalQuery({
  args: {},
  handler: async (ctx) => {
    const envToken = process.env.BALE_BOT_TOKEN;
    if (typeof envToken === "string" && envToken.trim().length > 0) {
      return { token: envToken.trim(), source: "env" as const };
    }

    const bots = await ctx.db.query("baleBot").collect();
    const bot = bots[0];
    if (!bot?.tokenEncrypted) return null;
    return { token: deobfuscateToken(bot.tokenEncrypted), source: "db" as const };
  },
});

/**
 * Internal: runtime config the webhook needs.
 *
 * Reads existing `baleBot` fields only — no new tables or fields were added
 * for the Bale bot/webhook step.
 */
export const _getBotRuntimeConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bots = await ctx.db.query("baleBot").collect();
    const bot = bots[0];
    const envToken = process.env.BALE_BOT_TOKEN;

    return {
      configured: (typeof envToken === "string" && envToken.trim().length > 0) || !!bot?.tokenEncrypted,
      active: bot?.active ?? true,
      startMessage: bot?.startMessage?.trim() || null,
      botUsername: bot?.botUsername?.trim() || null,
      siteUrl: process.env.SITE_URL ?? null,
    };
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

/** Internal: find user by Bale ID — used by the Mini App auth layer */
export const _findUserByBaleId = internalQuery({
  args: { baleId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_baleId", (q) => q.eq("baleId", args.baleId))
      .first();
  },
});

/** Internal: find user by ID — server-side lookups only */
export const _findUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Bale linking status for the signed-in user (mirrors the Telegram equivalent).
 * Read-only and scoped to the caller's own record — it never returns platform
 * ids of other users and cannot change anything.
 */
export const getLinkingStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const bots = await ctx.db.query("baleBot").collect();
    return {
      linked: !!user.baleId,
      baleUsername: user.baleUsername ?? null,
      baleFirstName: user.baleFirstName ?? null,
      linkedAt: user.baleLinkedAt ?? null,
      botUsername: process.env.BALE_BOT_USERNAME ?? bots[0]?.botUsername ?? null,
    };
  },
});

/** Disconnect Bale from the signed-in account. */
export const unlinkBale = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("لطفاً وارد شوید.");

    await ctx.db.patch(userId, {
      baleId: undefined,
      baleUsername: undefined,
      baleFirstName: undefined,
      baleLinkedAt: undefined,
    });

    // Release only Bale's slot. The same account code may still be used for
    // Telegram (and a later Bale reconnect), so disconnecting one messenger
    // must not invalidate the other connection.
    const codes = await ctx.db
      .query("telegramLinkingCodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const code of codes) {
      if (code.baleId) await ctx.db.patch(code._id, { baleId: undefined });
      if (!code.usedAt && !code.telegramId && !code.baleId) await ctx.db.delete(code._id);
    }
    return { success: true };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Internal: complete account linking from a one-time code entered in the bot.
 *
 * The code is created by the signed-in user on the website (see
 * telegramBot.generateLinkingCode — the same table serves both bots), so an
 * arbitrary webhook payload alone can never link anything without a valid,
 * unexpired, unused code. Everything is re-validated atomically here.
 */
export const _completeLinkingByCode = internalMutation({
  args: {
    codeId: v.id("telegramLinkingCodes"),
    baleId: v.number(),
    baleUsername: v.optional(v.string()),
    baleFirstName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const codeDoc = await ctx.db.get(args.codeId);
    if (!codeDoc) return { success: false as const, reason: "already_used" as const };
    if (Date.now() > codeDoc.expiresAt) return { success: false as const, reason: "expired" as const };

    // A linking code belongs to one Genova account and can be used once per
    // messenger. This lets the same account connect both Telegram and Bale.
    if (codeDoc.baleId && codeDoc.baleId !== args.baleId) {
      return { success: false as const, reason: "already_used" as const };
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_baleId", (q) => q.eq("baleId", args.baleId))
      .first();
    if (existingUser && existingUser._id !== codeDoc.userId) {
      return { success: false as const, reason: "already_linked" as const };
    }

    const now = Date.now();
    await ctx.db.patch(args.codeId, { baleId: args.baleId });
    await ctx.db.patch(codeDoc.userId, {
      baleId: args.baleId,
      baleUsername: args.baleUsername,
      baleFirstName: args.baleFirstName,
      baleLinkedAt: now,
    });
    return { success: true as const, userId: codeDoc.userId };
  },
});

/** Disconnect Bale when the command is sent from Bale itself. */
export const _unlinkBaleById = internalMutation({
  args: { baleId: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_baleId", (q) => q.eq("baleId", args.baleId))
      .first();
    if (!user) return { success: false as const };

    await ctx.db.patch(user._id, {
      baleId: undefined,
      baleUsername: undefined,
      baleFirstName: undefined,
      baleLinkedAt: undefined,
    });

    const codes = await ctx.db
      .query("telegramLinkingCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const code of codes) {
      if (code.baleId === args.baleId) {
        await ctx.db.patch(code._id, { baleId: undefined });
      }
    }
    return { success: true as const };
  },
});

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

/** Update bot info after test connection (internal) */
export const _updateBotInfo = internalMutation({
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


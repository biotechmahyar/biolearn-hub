import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
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
  // btoa is available in Convex JS runtime (unlike Node.js Buffer)
  return btoa(token);
}

function deobfuscateToken(encoded: string): string {
  if (!encoded) return "";
  // atob is available in Convex JS runtime
  return atob(encoded);
}

function maskToken(token: string): string {
  if (!token || token.length < 10) return "••••••••";
  return token.slice(0, 6) + "••••••••" + token.slice(-4);
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Public query for webhook handler — returns token for server-side use only */
/**
 * Internal bot config incl. the raw token — INTERNAL ONLY.
 *
 * This used to be a public, unauthenticated query, which meant the raw bot
 * token was readable by anyone who called it. It is only ever consumed by
 * server-side handlers (webhook + one-time setup endpoint), so it is now an
 * internalQuery. No client ever called it.
 */
export const getBotConfigPublic = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bots = await ctx.db.query("telegramBot").collect();
    return bots.map((b) => ({
      token: deobfuscateToken(b.tokenEncrypted),
      startMessage: b.startMessage,
      active: b.active,
      botUsername: b.botUsername ?? null, // needed for referral deep links
    }));
  },
});

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
      commands: bot.commands ?? [],
      commandsSyncedAt: bot.commandsSyncedAt ?? null,
      updatedAt: bot.updatedAt,
    };
  },
});

/**
 * Get the raw bot token — INTERNAL ONLY.
 *
 * Must never be a public query: any client that could read it would control
 * the bot. Only server-side callers (actions, webhook, auth layer) may use it.
 */
export const _getRawToken = internalQuery({
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

/** Save commands to DB (called after successful Telegram sync) */
export const saveCommands = mutation({
  args: {
    commands: v.array(v.object({ command: v.string(), description: v.string() })),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const bots = await ctx.db.query("telegramBot").collect();
    const bot = bots[0];
    if (!bot) throw new Error("بات تنظیم نشده است.");
    await ctx.db.patch(bot._id, {
      commands: args.commands,
      commandsSyncedAt: Date.now(),
      updatedBy: userId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/** Internal mutation to update bot info from actions (internal only) */
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

// ── Telegram Account Linking ─────────────────────────────────────────────────

/** Generate a one-time linking code for the current user */
export const generateLinkingCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("لطفاً وارد شوید.");

    // Invalidate any previous unused codes for this user
    const existing = await ctx.db
      .query("telegramLinkingCodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const code of existing) {
      if (!code.usedAt && !code.telegramId && !code.baleId) await ctx.db.delete(code._id);
    }

    // Generate a random 8-char code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const now = Date.now();
    await ctx.db.insert("telegramLinkingCodes", {
      userId,
      code,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
    });

    return { code };
  },
});

/** Get the current user's Telegram link status */
export const getLinkingStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Also return bot username for deep link
    const bots = await ctx.db.query("telegramBot").collect();
    const botUsername = bots[0]?.botUsername ?? null;

    return {
      linked: !!user.telegramId,
      telegramId: user.telegramId ?? null,
      telegramUsername: user.telegramUsername ?? null,
      telegramFirstName: user.telegramFirstName ?? null,
      linkedAt: user.telegramLinkedAt ?? null,
      botUsername,
    };
  },
});

/** Disconnect Telegram from the current user's account */
export const unlinkTelegram = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("لطفاً وارد شوید.");

    await ctx.db.patch(userId, {
      telegramId: undefined,
      telegramUsername: undefined,
      telegramFirstName: undefined,
      telegramLinkedAt: undefined,
    });

    // Keep the account's code usable for the other messenger, but release the
    // Telegram slot so disconnect → generate a new code → reconnect works.
    // Previously the stale telegramId stayed on the code and could make a
    // later connection look like it belonged to another user.
    const codes = await ctx.db
      .query("telegramLinkingCodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const c of codes) {
      if (c.telegramId) await ctx.db.patch(c._id, { telegramId: undefined });
      if (!c.usedAt && !c.telegramId && !c.baleId) await ctx.db.delete(c._id);
    }

    return { success: true };
  },
});

/** Disconnect Telegram when the command is sent from Telegram itself. */
export const _unlinkTelegramById = internalMutation({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (!user) return { success: false as const };

    await ctx.db.patch(user._id, {
      telegramId: undefined,
      telegramUsername: undefined,
      telegramFirstName: undefined,
      telegramLinkedAt: undefined,
    });

    const codes = await ctx.db
      .query("telegramLinkingCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const code of codes) {
      if (code.telegramId === args.telegramId) {
        await ctx.db.patch(code._id, { telegramId: undefined });
      }
    }
    return { success: true as const };
  },
});
/** Internal: find user by Telegram ID — called from webhook handler */
export const _findUserByTelegramId = internalQuery({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
  },
});


/** Internal: look up a linking code — called from webhook handler */
export const _findLinkingCode = internalQuery({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("telegramLinkingCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .collect();
    return results[0] ?? null;
  },
});

/** Find user by Telegram ID (for Mini App auth) */
export const authByTelegramId = query({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? null,
      telegramUsername: user.telegramUsername ?? null,
      telegramFirstName: user.telegramFirstName ?? null,
    };
  },
});

/** Internal: mark a linking code as used and link the Telegram account */
export const _completeLinking = internalMutation({
  args: {
    codeId: v.id("telegramLinkingCodes"),
    telegramId: v.number(),
    telegramUsername: v.optional(v.string()),
    telegramFirstName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const codeDoc = await ctx.db.get(args.codeId);
    if (!codeDoc) return { success: false as const, reason: "already_used" as const };

    const now = Date.now();
    if (now > codeDoc.expiresAt) return { success: false as const, reason: "expired" as const };

    // The same account code can link Telegram and Bale independently.
    // A code is single-use per messenger, not single-use for the whole account.
    if (codeDoc.telegramId && codeDoc.telegramId !== args.telegramId) {
      return { success: false as const, reason: "already_used" as const };
    }

    // Check if this telegramId is already linked to another user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (existingUser && existingUser._id !== codeDoc.userId) {
      return { success: false as const, reason: "already_linked" as const };
    }

    // Mark code as used
    await ctx.db.patch(args.codeId, {
      telegramId: args.telegramId,
    });

    // Link the Telegram account to the Genova user
    await ctx.db.patch(codeDoc.userId, {
      telegramId: args.telegramId,
      telegramUsername: args.telegramUsername,
      telegramFirstName: args.telegramFirstName,
      telegramLinkedAt: now,
    });

    return { success: true as const, userId: codeDoc.userId };
  },
});

/** Internal: find user by ID — server-side lookups only */
export const _findUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// NOTE: the old public `_linkDirect` mutation was removed. It accepted an
// arbitrary `userId` from the caller, so any signed-in client could have linked
// its own Telegram account onto another user's record and then signed in as
// that user (account takeover). Linking now goes through the shared, HMAC-
// driven, transactional `miniAppAuth.linkMiniAppIdentity`.

/** Count users with linked Telegram accounts */
export const _countLinkedUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((u) => !!u.telegramId).length;
  },
});

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("ابتدا وارد شوید.");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("کاربر یافت نشد.");
  return { userId, user };
}

async function sendTelegramMessage(token: string, chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  return await resp.json();
}

// ── Default preferences ──────────────────────────────────────────────────────

const DEFAULT_PREFS = {
  mentorReplies: true,
  tasks: true,
  deadlines: true,
  meetings: true,
  groupNotifs: true,
  articles: true,
  system: true,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/** Get user's notification preferences */
export const getNotifPrefs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const prefs = await ctx.db
      .query("telegramNotifPrefs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    return {
      masterEnabled: user.telegramNotificationsEnabled ?? false,
      linked: !!user.telegramId,
      categories: prefs ?? DEFAULT_PREFS,
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

/** Toggle master notification switch */
export const toggleMaster = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    if (!user.telegramId) throw new Error("ابتدا Telegram خود را متصل کنید.");

    const enabled = !(user.telegramNotificationsEnabled ?? false);
    await ctx.db.patch(userId, { telegramNotificationsEnabled: enabled });
    return { enabled };
  },
});

/** Update a single notification category preference */
export const updateCategoryPref = mutation({
  args: {
    category: v.union(
      v.literal("mentorReplies"),
      v.literal("tasks"),
      v.literal("deadlines"),
      v.literal("meetings"),
      v.literal("groupNotifs"),
      v.literal("articles"),
      v.literal("system"),
    ),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const existing = await ctx.db
      .query("telegramNotifPrefs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { [args.category]: args.enabled });
    } else {
      await ctx.db.insert("telegramNotifPrefs", {
        userId,
        ...DEFAULT_PREFS,
        [args.category]: args.enabled,
      });
    }
    return { success: true };
  },
});

// ── Internal: check if notification should be sent ───────────────────────────

async function shouldNotify(ctx: any, userId: string, type: string, key: string): Promise<boolean> {
  // 1. Duplicate check
  const existing = await ctx.db
    .query("telegramNotifLog")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  if (existing) return false;

  // 2. User must have Telegram linked
  const user = await ctx.db.get(userId);
  if (!user?.telegramId) return false;

  // 3. Master toggle
  if (!user.telegramNotificationsEnabled) return false;

  // 4. Category preference
  const prefs = await ctx.db
    .query("telegramNotifPrefs")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  const catPrefs = prefs ?? DEFAULT_PREFS;
  const categoryMap: Record<string, string> = {
    mentor_reply: "mentorReplies",
    task: "tasks",
    deadline: "deadlines",
    meeting: "meetings",
    group: "groupNotifs",
    article: "articles",
    system: "system",
  };
  const catKey = categoryMap[type];
  if (catKey && !(catPrefs as any)[catKey]) return false;

  return true;
}

async function logNotification(ctx: any, userId: string, type: string, key: string, success: boolean) {
  await ctx.db.insert("telegramNotifLog", {
    userId,
    type,
    key,
    sentAt: Date.now(),
    success,
  });
}

// ── Send a single notification ───────────────────────────────────────────────

export const sendNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    key: v.string(),
    title: v.string(),
    message: v.string(),
    linkUrl: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ok = await shouldNotify(ctx, args.userId, args.type, args.key);
    if (!ok) return { sent: false, reason: "skipped" };

    const user = await ctx.db.get(args.userId);
    if (!user?.telegramId) return { sent: false, reason: "no_telegram" };

    // Get bot token
    const bots = await ctx.db.query("telegramBot").collect();
    const bot = bots[0];
    if (!bot?.tokenEncrypted) return { sent: false, reason: "no_bot" };

    const token = atob(bot.tokenEncrypted);
    const text = `${args.title}\n\n${args.message}`;

    let replyMarkup: any = undefined;
    if (args.linkUrl && args.linkLabel) {
      replyMarkup = {
        inline_keyboard: [[{ text: args.linkLabel, url: args.linkUrl }]],
      };
    }

    try {
      const result = await sendTelegramMessage(token, user.telegramId, text, replyMarkup);
      const success = result.ok === true;
      await logNotification(ctx, args.userId, args.type, args.key, success);

      // If bot blocked by user, disable their notifications
      if (!success && result.description?.includes("blocked")) {
        await ctx.db.patch(args.userId, { telegramNotificationsEnabled: false });
      }

      return { sent: success, reason: success ? "sent" : (result.description ?? "unknown") };
    } catch {
      await logNotification(ctx, args.userId, args.type, args.key, false);
      return { sent: false, reason: "network_error" };
    }
  },
});

// ── Broadcast to multiple users ──────────────────────────────────────────────

export const broadcastNotification = mutation({
  args: {
    userIds: v.array(v.id("users")),
    type: v.string(),
    key: v.string(),
    title: v.string(),
    message: v.string(),
    linkUrl: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let sentCount = 0;
    for (const userId of args.userIds) {
      const result = await ctx.runMutation(api.telegramNotifications.sendNotification, {
        userId,
        type: args.type,
        key: `${args.key}:${userId}`,
        title: args.title,
        message: args.message,
        linkUrl: args.linkUrl,
        linkLabel: args.linkLabel,
      });
      if (result.sent) sentCount++;
    }
    return { sentCount, total: args.userIds.length };
  },
});

// ── Cleanup old logs ─────────────────────────────────────────────────────────

export const cleanupOldLogs = mutation({
  args: { olderThanMs: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    const logs = await ctx.db.query("telegramNotifLog").collect();
    let deleted = 0;
    for (const log of logs) {
      if (log.sentAt < cutoff) {
        await ctx.db.delete(log._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

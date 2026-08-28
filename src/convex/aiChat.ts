import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Free tier limits ────────────────────────────────────────────────────────
const FREE_LIMITS: Record<string, number> = {
  user: 3,
  member: 3,
  instructor: 10,
  mentor: 10,
  content_manager: 10,
  support: 10,
  admin: 9999,
  site_admin: 9999,
};

// ── Queries ─────────────────────────────────────────────────────────────────

export const listMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("aiConversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getConversationMessages = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    // Verify ownership
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== userId) return [];
    return await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

export const getMyUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const today = new Date().toISOString().split("T")[0];
    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .first();

    // Check for custom quota override
    const quota = await ctx.db
      .query("aiTokenQuotas")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const roleLimit = FREE_LIMITS[(user as any).role ?? "user"] ?? 3;
    const dailyLimit = quota?.dailyLimit ?? roleLimit;

    return {
      messagesSent: usage?.messagesSent ?? 0,
      tokensUsed: usage?.tokensUsed ?? 0,
      dailyLimit,
      remaining: Math.max(0, dailyLimit - (usage?.messagesSent ?? 0)),
      role: (user as any).role ?? "user",
    };
  },
});

// ── Mutations ──────────────────────────────────────────────────────────────

export const createConversation = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ورود لازم است.");
    const now = Date.now();
    return await ctx.db.insert("aiConversations", {
      userId,
      title: args.title ?? "چت جدید",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ورود لازم است.");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("کاربر یافت نشد.");

    const userRole = (user as any).role ?? "user";

    // Verify ownership
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== userId) {
      throw new Error("دسترسی غیرمجاز.");
    }

    // Check daily limit
    const today = new Date().toISOString().split("T")[0];
    let usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .first();

    // Check for custom quota
    const quota = await ctx.db
      .query("aiTokenQuotas")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const roleLimit = FREE_LIMITS[userRole] ?? 3;
    const dailyLimit = quota?.dailyLimit ?? roleLimit;
    const currentMessages = usage?.messagesSent ?? 0;

    if (currentMessages >= dailyLimit) {
      throw new Error(
        `محدودیت روزانه تمام شده. فردا دوباره شارژ می‌شود. (${dailyLimit}/${dailyLimit})`
      );
    }

    // Save user message
    const now = Date.now();
    await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      tokensUsed: 0,
      createdAt: now,
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      updatedAt: now,
      title: convo.title === "چت جدید"
        ? args.content.slice(0, 50)
        : convo.title,
    });

    // Update usage
    if (usage) {
      await ctx.db.patch(usage._id, {
        messagesSent: currentMessages + 1,
      });
    } else {
      await ctx.db.insert("aiUsage", {
        userId,
        date: today,
        messagesSent: 1,
        tokensUsed: 0,
      });
    }

    // Get AI config
    const config = await ctx.db.query("aiConfig").first();
    if (!config || !config.apiKeyEncrypted) {
      // No AI configured yet — return a placeholder response
      const aiMsg = await ctx.db.insert("aiMessages", {
        conversationId: args.conversationId,
        role: "assistant",
        content:
          "هوش مصنوعی هنوز توسط مدیر سایت پیکربندی نشده است. لطفاً منتظر بمانید تا کلید API تنظیم شود.",
        tokensUsed: 0,
        createdAt: Date.now(),
      });
      return {
        aiMessageId: aiMsg,
        remaining: Math.max(0, dailyLimit - currentMessages - 1),
      };
    }

    // Build message history for context
    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    const chatMessages = [
      { role: "system", content: config.systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // Call AI provider via action
    // For now, return a placeholder since the actual AI call needs to happen server-side
    const aiMsg = await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: `[پاسخ هوش مصنوعی — اتصال به ${config.provider}/${config.model} در حال راه‌اندازی]\n\nپیام شما دریافت شد. به زودی هوش مصنوعی فعال خواهد شد.`,
      tokensUsed: 0,
      createdAt: Date.now(),
    });

    return {
      aiMessageId: aiMsg,
      remaining: Math.max(0, dailyLimit - currentMessages - 1),
    };
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ورود لازم است.");
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== userId) {
      throw new Error("دسترسی غیرمجاز.");
    }
    // Delete all messages
    const msgs = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    for (const m of msgs) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(args.conversationId);
    return { success: true };
  },
});

export const renameConversation = mutation({
  args: { conversationId: v.id("aiConversations"), title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ورود لازم است.");
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== userId) {
      throw new Error("دسترسی غیرمجاز.");
    }
    await ctx.db.patch(args.conversationId, { title: args.title });
    return { success: true };
  },
});

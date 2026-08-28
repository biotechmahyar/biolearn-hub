import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// ── Free tier limits ────────────────────────────────────────────────────────
const FREE_LIMITS: Record<string, number> = {
  user: 3,
  member: 3,
  instructor: 10,
  mentor: 10,
  content_manager: 10,
  support: 10,
  admin: 100,
  site_admin: 100,
};

// Max conversations to keep per user (regular users only)
const MAX_CONVERSATIONS = 10;

// ── Internal queries (only callable from server-side actions) ────────────────

/**
 * Returns the raw AI config including the API key.
 * ONLY callable from server-side actions via ctx.runQuery.
 * Never exposed to the browser.
 */
export const getAIConfigRaw = internalQuery({
  args: { modelId: v.optional(v.id("aiModels")) },
  handler: async (ctx, args) => {
    // If modelId is provided, use that specific model
    if (args.modelId) {
      const model = await ctx.db.get(args.modelId);
      if (model && model.active) {
        return {
          apiKey: model.apiKey,
          baseUrl: model.baseUrl,
          model: model.model,
          provider: model.provider,
          temperature: model.temperature,
          maxTokensPerRequest: model.maxTokens,
          systemPrompt: model.systemPrompt ?? "شما یک دستیار تخصصی علوم زیستی هستید.",
        };
      }
    }
    // Fallback to legacy single config
    const config = await ctx.db.query("aiConfig").first();
    if (!config) return null;
    return {
      apiKey: config.apiKeyEncrypted,
      baseUrl: config.baseUrl,
      model: config.model,
      provider: config.provider,
      temperature: config.temperature,
      maxTokensPerRequest: config.maxTokensPerRequest,
      systemPrompt: config.systemPrompt,
    };
  },
});

// ── Model queries ──────────────────────────────────────────────────────────

/**
 * List all active AI models for users to choose from.
 */
export const listActiveModels = query({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db.query("aiModels").collect();
    return models
      .filter((m) => m.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({
        _id: m._id,
        name: m.name,
        provider: m.provider,
        model: m.model,
        isFree: m.isFree,
        dailyLimit: m.dailyLimit,
        pricePerMessage: m.pricePerMessage,
        description: m.description,
        active: m.active,
      }));
  },
});

/**
 * Get a specific model's raw config (server-side only).
 */
export const getModelConfigRaw = internalQuery({
  args: { modelId: v.id("aiModels") },
  handler: async (ctx, args) => {
    const model = await ctx.db.get(args.modelId);
    if (!model || !model.active) return null;
    return {
      apiKey: model.apiKey,
      baseUrl: model.baseUrl,
      model: model.model,
      provider: model.provider,
      temperature: model.temperature,
      maxTokens: model.maxTokens,
      systemPrompt: model.systemPrompt ?? "",
    };
  },
});

/**
 * Internal query: get messages for a conversation (callable from actions only).
 */
export const getConversationMessagesInternal = internalQuery({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

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
  args: { title: v.optional(v.string()), modelId: v.optional(v.id("aiModels")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ورود لازم است.");

    // Get user role to check if we need to enforce conversation limit
    const user = await ctx.db.get(userId);
    const userRole = (user as any)?.role ?? "user";
    const isRegular = userRole === "user" || userRole === "member";

    // Auto-cleanup: keep only MAX_CONVERSATIONS for regular users
    if (isRegular) {
      const existing = await ctx.db
        .query("aiConversations")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();

      if (existing.length >= MAX_CONVERSATIONS) {
        // Delete oldest conversations to make room
        const toDelete = existing.slice(MAX_CONVERSATIONS - 1);
        for (const c of toDelete) {
          // Delete all messages in the conversation first
          const msgs = await ctx.db
            .query("aiMessages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
            .collect();
          for (const m of msgs) {
            await ctx.db.delete(m._id);
          }
          await ctx.db.delete(c._id);
        }
      }
    }

    const now = Date.now();
    return await ctx.db.insert("aiConversations", {
      userId,
      title: args.title ?? "چت جدید",
      modelId: args.modelId ?? undefined,
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

    // Trigger AI response asynchronously via action
    // The action will read the config and messages, call the API, and save the response
    // Look up modelId from the conversation to pass to the action
    const convoModel = convo.modelId ? await ctx.db.get(convo.modelId) : null;
    await ctx.scheduler.runAfter(0, api.aiActions.callAI, {
      conversationId: args.conversationId,
      modelId: convo.modelId ?? undefined,
    });

    return {
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

export const deleteMessage = mutation({
  args: { messageId: v.id("aiMessages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("ورود لازم است.");
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("پیام یافت نشد.");
    // Verify ownership via conversation
    const convo = await ctx.db.get(msg.conversationId);
    if (!convo || convo.userId !== userId) {
      throw new Error("دسترسی غیرمجاز.");
    }
    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});

// ── Internal mutation to save AI messages (called from actions) ──────────────

export const saveAIMessage = internalMutation({
  args: {
    conversationId: v.id("aiConversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: args.content,
      tokensUsed: 0,
      createdAt: Date.now(),
    });
    // Update conversation timestamp
    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
    });
  },
});

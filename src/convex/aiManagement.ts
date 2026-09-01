import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Helper: require admin or site_admin ────────────────────────────────────
async function requireAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("ورود لازم است.");
  if (user.role !== "admin" && user.role !== "site_admin") {
    throw new Error("فقط مدیران به این بخش دسترسی دارند.");
  }
  return user;
}

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

// ── Queries ─────────────────────────────────────────────────────────────────

export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("aiConfig").first();
    if (!config) return null;
    // Return masked config — never expose API key
    return {
      _id: config._id,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      apiKeyMasked: config.apiKeyEncrypted.length > 4
        ? "••••••" + config.apiKeyEncrypted.slice(-4)
        : "••••",
      maxTokensPerRequest: config.maxTokensPerRequest,
      temperature: config.temperature,
      systemPrompt: config.systemPrompt,
      updatedAt: config.updatedAt,
    };
  },
});

export const getFullConfig = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    if (user.role !== "admin" && user.role !== "site_admin") return null;
    const config = await ctx.db.query("aiConfig").first();
    if (!config) return null;
    return {
      _id: config._id,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      apiKeyMasked: config.apiKeyEncrypted.length > 4
        ? "••••••" + config.apiKeyEncrypted.slice(-4)
        : "••••",
      hasApiKey: config.apiKeyEncrypted.length > 0,
      maxTokensPerRequest: config.maxTokensPerRequest,
      temperature: config.temperature,
      systemPrompt: config.systemPrompt,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
    };
  },
});

export const listPrompts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("aiPrompts").collect();
  },
});

export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (user.role !== "admin" && user.role !== "site_admin") return [];
    // Admin sees all conversations with user info
    const convos = await ctx.db.query("aiConversations").collect();
    const results = [];
    for (const c of convos) {
      const u = await ctx.db.get(c.userId);
      results.push({
        ...c,
        userName: u?.name ?? u?.email ?? "ناشناس",
        userRole: (u as any)?.role ?? "user",
      });
    }
    return results;
  },
});

export const getUserUsage = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (user.role !== "admin" && user.role !== "site_admin") return [];
    const today = args.date ?? new Date().toISOString().split("T")[0];
    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_date")
      .collect();
    // Filter for the specific date
    return usage.filter((u) => u.date === today);
  },
});

export const getAllUsageHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (user.role !== "admin" && user.role !== "site_admin") return [];
    return await ctx.db.query("aiUsage").collect();
  },
});

export const listTokenQuotas = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (user.role !== "admin" && user.role !== "site_admin") return [];
    const quotas = await ctx.db.query("aiTokenQuotas").collect();
    const results = [];
    for (const q of quotas) {
      const u = await ctx.db.get(q.userId);
      results.push({
        ...q,
        userName: u?.name ?? u?.email ?? "ناشناس",
        userRole: (u as any)?.role ?? "user",
      });
    }
    return results;
  },
});

// Get the caller's daily usage and limits
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

    // Check for custom quota
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
    };
  },
});

// ── Mutations ──────────────────────────────────────────────────────────────

export const saveConfig = mutation({
  args: {
    provider: v.string(),
    model: v.string(),
    baseUrl: v.string(),
    apiKey: v.string(), // Plaintext from admin, stored encrypted (here we just store as-is for simplicity)
    maxTokensPerRequest: v.number(),
    temperature: v.number(),
    systemPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const existing = await ctx.db.query("aiConfig").first();

    const configData = {
      provider: args.provider,
      model: args.model,
      baseUrl: args.baseUrl,
      apiKeyEncrypted: args.apiKey, // In production, encrypt this
      maxTokensPerRequest: args.maxTokensPerRequest,
      temperature: args.temperature,
      systemPrompt: args.systemPrompt,
      updatedAt: Date.now(),
      updatedBy: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, configData);
    } else {
      await ctx.db.insert("aiConfig", configData);
    }
    return { success: true };
  },
});

export const deleteConfig = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("aiConfig").first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});

export const createPrompt = mutation({
  args: {
    name: v.string(),
    content: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    return await ctx.db.insert("aiPrompts", {
      name: args.name,
      content: args.content,
      category: args.category,
      isDefault: false,
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const updatePrompt = mutation({
  args: {
    promptId: v.id("aiPrompts"),
    name: v.string(),
    content: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.promptId, {
      name: args.name,
      content: args.content,
      category: args.category,
    });
    return { success: true };
  },
});

export const deletePrompt = mutation({
  args: { promptId: v.id("aiPrompts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.promptId);
    return { success: true };
  },
});

export const setDefaultPrompt = mutation({
  args: { promptId: v.id("aiPrompts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Unset all defaults
    const all = await ctx.db.query("aiPrompts").collect();
    for (const p of all) {
      if (p.isDefault) {
        await ctx.db.patch(p._id, { isDefault: false });
      }
    }
    await ctx.db.patch(args.promptId, { isDefault: true });
    return { success: true };
  },
});

export const grantTokens = mutation({
  args: {
    userId: v.id("users"),
    dailyLimit: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db
      .query("aiTokenQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        dailyLimit: args.dailyLimit,
        grantedAt: Date.now(),
        grantedBy: admin._id,
        note: args.note,
      });
    } else {
      await ctx.db.insert("aiTokenQuotas", {
        userId: args.userId,
        dailyLimit: args.dailyLimit,
        extraTokens: 0,
        grantedAt: Date.now(),
        grantedBy: admin._id,
        note: args.note,
      });
    }
    return { success: true };
  },
});

export const revokeTokens = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("aiTokenQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});

export const resetAllUsage = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const today = new Date().toISOString().split("T")[0];
    const all = await ctx.db.query("aiUsage").collect();
    for (const u of all) {
      if (u.date === today) {
        await ctx.db.patch(u._id, { messagesSent: 0, tokensUsed: 0 });
      }
    }
    return { success: true };
  },
});


// ── AI Models CRUD ─────────────────────────────────────────────────────────

export const listModels = query({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db.query("aiModels").collect();
    return models.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listActiveModelsPublic = query({
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

export const createModel = mutation({
  args: {
    name: v.string(),
    provider: v.string(),
    model: v.string(),
    baseUrl: v.string(),
    apiKey: v.string(),
    isFree: v.boolean(),
    dailyLimit: v.number(),
    pricePerMessage: v.number(),
    description: v.string(),
    systemPrompt: v.optional(v.string()),
    maxTokens: v.number(),
    temperature: v.number(),
    active: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    return await ctx.db.insert("aiModels", {
      ...args,
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const updateModel = mutation({
  args: {
    modelId: v.id("aiModels"),
    name: v.string(),
    provider: v.string(),
    model: v.string(),
    baseUrl: v.string(),
    apiKey: v.string(),
    isFree: v.boolean(),
    dailyLimit: v.number(),
    pricePerMessage: v.number(),
    description: v.string(),
    systemPrompt: v.optional(v.string()),
    maxTokens: v.number(),
    temperature: v.number(),
    active: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { modelId, ...data } = args;
    await ctx.db.patch(modelId, data);
    return { success: true };
  },
});

export const deleteModel = mutation({
  args: { modelId: v.id("aiModels") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.modelId);
    return { success: true };
  },
});

export const toggleModelActive = mutation({
  args: { modelId: v.id("aiModels") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const model = await ctx.db.get(args.modelId);
    if (!model) throw new Error("مدل یافت نشد.");
    await ctx.db.patch(args.modelId, { active: !model.active });
    return { success: true };
  },
});

export const getModelDetail = query({
  args: { modelId: v.id("aiModels") },
  handler: async (ctx, args) => {
    const model = await ctx.db.get(args.modelId);
    if (!model) return null;
    // Return masked API key
    return {
      ...model,
      apiKeyMasked: model.apiKey.length > 4
        ? "••••••" + model.apiKey.slice(-4)
        : "••••",
      hasApiKey: model.apiKey.length > 0,
    };
  },
});

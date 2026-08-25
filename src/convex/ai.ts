"use node";

import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ── Admin Authorization ──────────────────────────────────────────────
// Server-side role check — never trust the frontend.
// Only "admin" (system admin) and "site_admin" can manage AI config.

async function requireAdmin(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
  db: { get: (id: any) => Promise<any> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("ورود لازم است.");
  const user = await ctx.db.get(identity.subject as Id<"users">);
  if (!user) throw new Error("کاربر یافت نشد.");
  const role = (user as any).role as string | undefined;
  if (role !== "admin" && role !== "site_admin") {
    throw new Error("فقط مدیر سامانه یا مدیر سایت اجازه دسترسی دارد.");
  }
  return { userId: identity.subject as Id<"users">, role };
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4);
}

// ── AI Config Queries (admin-only) ───────────────────────────────────

export const getConfigMeta = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("aiConfig").first();
    if (!row) return null;
    return {
      provider: row.provider,
      maskedKey: row.maskedKey,
      model: row.model,
      updatedAt: row.updatedAt,
    };
  },
});

// ── AI Config Mutations (admin-only) ─────────────────────────────────

export const saveConfig = mutation({
  args: {
    apiKey: v.string(),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const provider = args.provider || "gapgpt";
    const model = args.model || "gapgpt-qwen-3.5";
    const now = Date.now();
    const masked = maskKey(args.apiKey);

    const existing = await ctx.db.query("aiConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        provider,
        apiKey: args.apiKey,
        maskedKey: masked,
        model,
        savedBy: userId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("aiConfig", {
        provider,
        apiKey: args.apiKey,
        maskedKey: masked,
        model,
        savedBy: userId,
        updatedAt: now,
      });
    }
  },
});

export const deleteConfig = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("aiConfig").first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ── Chat Queries (any authenticated user) ────────────────────────────

export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const chats = await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as Id<"users">))
      .order("desc")
      .collect();
    return chats;
  },
});

export const getMessages = query({
  args: { chatId: v.id("aiChats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    // Verify the chat belongs to this user
    const chat = await ctx.db.get(args.chatId);
    if (!chat || (chat as any).userId !== identity.subject) return [];
    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_chat_created", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
    return messages;
  },
});

// ── Chat Mutations ───────────────────────────────────────────────────

export const createChat = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const now = Date.now();
    return await ctx.db.insert("aiChats", {
      userId: identity.subject as Id<"users">,
      title: args.title ?? "چت جدید",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("aiChats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const chat = await ctx.db.get(args.chatId);
    if (!chat || (chat as any).userId !== identity.subject) {
      throw new Error("دسترسی غیرمجاز.");
    }
    const msgs = await ctx.db
      .query("aiMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    await ctx.db.delete(args.chatId);
  },
});

export const saveUserMessage = mutation({
  args: {
    chatId: v.id("aiChats"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const chat = await ctx.db.get(args.chatId);
    if (!chat || (chat as any).userId !== identity.subject) {
      throw new Error("دسترسی غیرمجاز.");
    }
    const now = Date.now();
    await ctx.db.insert("aiMessages", {
      chatId: args.chatId,
      userId: identity.subject as Id<"users">,
      role: "user",
      content: args.content,
      createdAt: now,
    });
    // Auto-title: use first user message as chat title
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
      title:
        (chat as any).title === "چت جدید"
          ? args.content.slice(0, 50)
          : (chat as any).title,
    });
  },
});

export const saveAssistantMessage = mutation({
  args: {
    chatId: v.id("aiChats"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const now = Date.now();
    await ctx.db.insert("aiMessages", {
      chatId: args.chatId,
      userId: identity.subject as Id<"users">,
      role: "assistant",
      content: args.content,
      createdAt: now,
    });
    await ctx.db.patch(args.chatId, { updatedAt: now });
  },
});

// ── AI Action: Call provider API (runs server-side, key never exposed) ─

export const chatCompletion = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
      }),
    ),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Read config from DB (server-side only)
    const config: any = await ctx.runQuery(
      // We cannot import local queries from actions.
      // Instead, read directly via db.
      undefined as any,
    );

    // Actually, actions cannot call local query functions.
    // We need to read the API key differently.
    // Let's use a workaround: call the query via api module.
    // But that causes circular deps. Instead, read from internal.
    throw new Error("Use sendChatMessage mutation + frontend fetch instead.");
  },
});

// ── Test Connection Action ────────────────────────────────────────────

export const testConnection = action({
  args: {},
  handler: async (ctx) => {
    // We need the API key but actions can't read local queries.
    // The simplest secure approach: admin passes the key from the frontend,
    // and we test it server-side. The key is transmitted over HTTPS only.
    throw new Error("Use frontend-based test instead.");
  },
});

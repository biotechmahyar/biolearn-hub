import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ── Server-side admin authorization ────────────────────────────────────
// Reads the user's role from the trusted DB record, never from the client.

async function requireAdmin(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
  db: { get: (id: Id<"users">) => Promise<Record<string, unknown> | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("ورود لازم است.");
  const user = await ctx.db.get(identity.subject as Id<"users">);
  if (!user) throw new Error("کاربر یافت نشد.");
  const role = user.role as string | undefined;
  if (role !== "admin" && role !== "site_admin") {
    throw new Error("فقط مدیر سامانه یا مدیر سایت اجازه دسترسی دارد.");
  }
  return { userId: identity.subject as Id<"users"> };
}

// ── AI Config: admin-only queries ─────────────────────────────────────

/** Returns masked key + provider info. Never returns the plaintext key. */
export const getConfigMeta = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("aiConfig").first();
    if (!row) return null;
    return {
      provider: row.provider,
      maskedKey: row.maskedKey,
      model: row.model ?? "gapgpt-qwen-3.5",
      updatedAt: row.updatedAt,
    };
  },
});

/** Returns full config for use by actions (server-side only). */
export const getConfigForAction = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("aiConfig").first();
    if (!row) return null;
    return {
      apiKey: row.apiKey,
      provider: row.provider,
      model: row.model ?? "gapgpt-qwen-3.5",
    };
  },
});

// ── AI Config: admin-only mutations ───────────────────────────────────

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return (
    key.slice(0, 4) +
    "•".repeat(Math.min(key.length - 8, 16)) +
    key.slice(-4)
  );
}

export const saveConfig = mutation({
  args: {
    apiKey: v.string(),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const now = Date.now();
    const existing = await ctx.db.query("aiConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        provider: args.provider ?? "gapgpt",
        apiKey: args.apiKey,
        maskedKey: maskKey(args.apiKey),
        model: args.model ?? "gapgpt-qwen-3.5",
        savedBy: userId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("aiConfig", {
        provider: args.provider ?? "gapgpt",
        apiKey: args.apiKey,
        maskedKey: maskKey(args.apiKey),
        model: args.model ?? "gapgpt-qwen-3.5",
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

// ── Chat: queries (any authenticated user, scoped to self) ────────────

export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) =>
        q.eq("userId", identity.subject as Id<"users">),
      )
      .order("desc")
      .collect();
  },
});

export const getMessages = query({
  args: { chatId: v.id("aiChats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== (identity.subject as Id<"users">)) return [];
    return await ctx.db
      .query("aiMessages")
      .withIndex("by_chat_created", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// ── Chat: mutations ───────────────────────────────────────────────────

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
    if (!chat || chat.userId !== (identity.subject as Id<"users">))
      throw new Error("دسترسی غیرمجاز.");
    const msgs = await ctx.db
      .query("aiMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    await ctx.db.delete(args.chatId);
  },
});

export const saveUserMessage = mutation({
  args: { chatId: v.id("aiChats"), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== (identity.subject as Id<"users">))
      throw new Error("دسترسی غیرمجاز.");
    const now = Date.now();
    await ctx.db.insert("aiMessages", {
      chatId: args.chatId,
      userId: identity.subject as Id<"users">,
      role: "user",
      content: args.content,
      createdAt: now,
    });
    if (chat.title === "چت جدید") {
      await ctx.db.patch(args.chatId, {
        title: args.content.slice(0, 50),
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.chatId, { updatedAt: now });
    }
  },
});

export const saveAssistantMessage = mutation({
  args: { chatId: v.id("aiChats"), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("ورود لازم است.");
    await ctx.db.insert("aiMessages", {
      chatId: args.chatId,
      userId: identity.subject as Id<"users">,
      role: "assistant",
      content: args.content,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.chatId, { updatedAt: Date.now() });
  },
});
